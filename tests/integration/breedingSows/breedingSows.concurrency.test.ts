import type { Response } from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREEDING_SOW_ERROR_CODES as codes } from "../../../src/services/breedingSows/breedingSowErrors";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { MATING_EVENT_ERROR_CODES as matingCodes } from "../../../src/services/matingEvents/matingEventErrors";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { breedingSowPayload, createBreedingSow } from "../../helpers/breedingSows";
import { runWithDatabaseBarrier } from "../../helpers/concurrency";
import { createFarrowing } from "../../helpers/farrowings";
import { createMatingEvent, matingPayload } from "../../helpers/matingEvents";

const base = "/api/breedingsows";
const retirement = { removal_date: "2024-06-15", removal_reason: "End of production" };

describe("breeding sow concurrency invariants", () => {
  it("preserves normalized uniqueness for competing create and update writes", async () => {
    const target = await createBreedingSow({ description: "Original" });
    const tag = " r a\tc\ne ";
    const responses = await runWithDatabaseBarrier<Response>(
      // Both writes wait after checking availability; the normalized index resolves the race.
      (tx) => tx.$executeRaw`LOCK TABLE breedingsows IN SHARE MODE`,
      async (start, wait) => {
        start(
          api.post(base).send({ ...breedingSowPayload(target.breed_id), sow_tag_number: "RACE" }),
        );
        start(
          api.put(`${base}/${target.sow_id}`).send({ sow_tag_number: tag, description: "Updated" }),
        );
        await wait(2);
      },
    );
    expect(responses.filter(({ status }) => status === 200 || status === 201)).toHaveLength(1);
    const conflict = responses.find(({ status }) => status === 409);
    expect(conflict).toBeDefined();
    if (conflict) expectApiError(conflict, 409, codes.BREEDING_SOW_TAG_NUMBER_ALREADY_EXISTS);
    const matches = await prisma.$queryRaw<Array<{ sow_id: number }>>`
      SELECT sow_id FROM breedingsows
      WHERE lower(regexp_replace(sow_tag_number, '[[:space:]]+', '', 'g')) = 'race'
    `;
    expect(matches).toHaveLength(1);
    expect(await prisma.breedingsows.findUnique({ where: { sow_id: target.sow_id } })).toEqual(
      responses[1].status === 409
        ? target
        : { ...target, sow_tag_number: tag, description: "Updated" },
    );
    expect(await prisma.breedingsows.count()).toBe(responses[0].status === 201 ? 2 : 1);
  });

  it("serializes overlapping retirement batches with reversed input order without partial changes", async () => {
    const first = await createBreedingSow();
    const second = await createBreedingSow();
    const event = await createMatingEvent();
    const third = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${first.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api
            .patch(`${base}/retire`)
            .send({ ...retirement, sow_ids: [second.sow_id, first.sow_id] }),
        );
        await wait(1);
        start(
          api.patch(`${base}/retire`).send({
            ...retirement,
            removal_reason: "Losing request",
            sow_ids: [third.sow_id, second.sow_id, first.sow_id],
          }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expect(responses[0].body).toEqual({ count: 2 });
    expectApiError(responses[1], 409, codes.BREEDING_SOW_ALREADY_RETIRED);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual([
      ...[first, second].map((sow) => ({
        ...sow,
        status: statuses.retirada,
        removal_date: new Date(retirement.removal_date),
        removal_reason: retirement.removal_reason,
      })),
      third,
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([event]);
  });

  it("rejects an ordinary update queued behind retirement", async () => {
    const sow = await createBreedingSow();
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${sow.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.patch(`${base}/retire`).send({ ...retirement, sow_ids: sow.sow_id }));
        await wait(1);
        start(
          api
            .put(`${base}/${sow.sow_id}`)
            .send({ entry_date: "2025-01-01", description: "Changed" }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 404, codes.BREEDING_SOW_NOT_FOUND);
    expect(await prisma.breedingsows.findMany()).toEqual([
      {
        ...sow,
        status: statuses.retirada,
        removal_date: new Date(retirement.removal_date),
        removal_reason: retirement.removal_reason,
      },
    ]);
  });

  it("revalidates an entry date updated before retirement obtains its lock", async () => {
    const sow = await createBreedingSow();
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${sow.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.put(`${base}/${sow.sow_id}`).send({ entry_date: "2025-01-01" }));
        await wait(1);
        start(api.patch(`${base}/retire`).send({ ...retirement, sow_ids: sow.sow_id }));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 400, codes.BREEDING_SOW_REMOVAL_DATE_BEFORE_ENTRY_DATE);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, entry_date: new Date("2025-01-01") },
    ]);
  });

  it("closes a farrowing created before the queued retirement obtains its lock", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${event.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api.post("/api/farrowings").send({
            sow_id: event.sow_id,
            farrowing_date: "2024-05-01",
            male_piglets: 5,
            female_piglets: 4,
          }),
        );
        await wait(1);
        start(api.patch(`${base}/retire`).send({ ...retirement, sow_ids: event.sow_id }));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(201);
    expect(responses[1].status).toBe(200);
    expect(await prisma.farrowings.findMany()).toEqual([
      expect.objectContaining({
        farrowing_id: responses[0].body.farrowing_id,
        sow_id: event.sow_id,
        mating_id: event.mating_id,
        weaned_date: new Date(retirement.removal_date),
        weaned_piglets: 0,
      }),
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...event, pregnancy_result: results.cerrado },
    ]);
    expect(await prisma.breedingsows.findUnique({ where: { sow_id: event.sow_id } })).toMatchObject(
      {
        status: statuses.retirada,
        farrowing_number: 1,
        last_weaning_date: null,
        removal_date: new Date(retirement.removal_date),
      },
    );
  });

  it("preserves actual weaning values when weaning completes ahead of retirement", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${farrowing.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api
            .patch(`/api/farrowings/${farrowing.farrowing_id}/wean`)
            .send({ weaned_date: "2024-06-01", weaned_piglets: 8 }),
        );
        await wait(1);
        start(api.patch(`${base}/retire`).send({ ...retirement, sow_ids: farrowing.sow_id }));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expect(responses[1].status).toBe(200);
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: new Date("2024-06-01"), weaned_piglets: 8 },
    ]);
    expect(
      await prisma.breedingsows.findUnique({ where: { sow_id: farrowing.sow_id } }),
    ).toMatchObject({
      status: statuses.retirada,
      farrowing_number: 1,
      last_weaning_date: new Date("2024-06-01"),
      removal_date: new Date(retirement.removal_date),
    });
  });

  it("rejects a new mating queued behind retirement without creating reproductive history", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${sow.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.patch(`${base}/retire`).send({ ...retirement, sow_ids: sow.sow_id }));
        await wait(1);
        start(api.post("/api/matingevents").send(matingPayload(sow.sow_id, boar.boar_id)));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 404, matingCodes.SOW_NOT_FOUND);
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([
      {
        ...sow,
        status: statuses.retirada,
        removal_date: new Date(retirement.removal_date),
        removal_reason: retirement.removal_reason,
      },
    ]);
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });
});
