import type { Response } from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { MATING_EVENT_ERROR_CODES as codes } from "../../../src/services/matingEvents/matingEventErrors";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { runWithDatabaseBarrier } from "../../helpers/concurrency";
import { createMatingEvent, matingPayload } from "../../helpers/matingEvents";

const base = "/api/matingevents";
const updatePath = `${base}/update/pregnancy-result`;

describe("mating concurrency invariants", () => {
  it("creates exactly one active mating when registrations compete for the same sow", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    const payload = matingPayload(sow.sow_id, boar.boar_id);
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${sow.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.post(base).send({ ...payload, notes: "Winning attempt" }));
        await wait(1);
        start(api.post(base).send({ ...payload, notes: "Losing attempt" }));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(201);
    expectApiError(responses[1], 409, codes.SOW_HAS_ACTIVE_MATING_EVENT);
    expect(await prisma.matingevents.findMany()).toEqual([
      expect.objectContaining({
        mating_id: responses[0].body.mating_id,
        sow_id: sow.sow_id,
        boar_id: boar.boar_id,
        pregnancy_result: results.pendiente,
        notes: "Winning attempt",
      }),
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("revalidates overlapping reversed batches without deadlock or partial changes", async () => {
    const first = await createMatingEvent();
    const second = await createMatingEvent();
    const third = await createMatingEvent();
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${first.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api.put(updatePath).send({
            mating_ids: [second.mating_id, first.mating_id],
            pregnancy_result: results.positivo,
          }),
        );
        await wait(1);
        start(
          api.put(updatePath).send({
            mating_ids: [third.mating_id, first.mating_id, second.mating_id],
            pregnancy_result: results.positivo,
          }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expect(responses[0].body).toEqual({ count: 2 });
    expectApiError(responses[1], 409, codes.MIXED_CURRENT_PREGNANCY_RESULTS);
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual([
      ...[first, second].map((event) => ({ ...event, pregnancy_result: results.positivo })),
      third,
    ]);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(
      sows.map((sow) =>
        sow.sow_id === third.sow_id ? sow : { ...sow, status: statuses.gestacion },
      ),
    );
  });

  it("rejects a pregnancy update queued behind sow retirement without reactivating the sow", async () => {
    const event = await createMatingEvent();
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    const retirement = { removal_date: "2024-06-15", removal_reason: "End of production" };
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${event.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.patch("/api/breedingsows/retire").send({ ...retirement, sow_ids: event.sow_id }));
        await wait(1);
        start(
          api
            .put(updatePath)
            .send({ mating_ids: event.mating_id, pregnancy_result: results.positivo }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 409, codes.MATING_EVENT_TRANSACTION_STATE_CHANGED);
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...event, pregnancy_result: results.cancelado },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      {
        ...sow,
        status: statuses.retirada,
        removal_date: new Date(retirement.removal_date),
        removal_reason: retirement.removal_reason,
      },
    ]);
    expect(await prisma.farrowings.count()).toBe(0);
  });

  it("preserves the mating when farrowing creation commits before queued deletion", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
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
        start(api.delete(`${base}/${event.mating_id}`));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(201);
    expectApiError(responses[1], 409, codes.MATING_EVENT_HAS_FARROWINGS);
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...event, pregnancy_result: results.cerrado },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.lactancia, farrowing_number: (sow.farrowing_number ?? 0) + 1 },
    ]);
    const saved = await prisma.farrowings.findFirstOrThrow();
    expect(JSON.parse(JSON.stringify(saved))).toEqual(responses[0].body);
    expect(saved).toMatchObject({
      sow_id: event.sow_id,
      mating_id: event.mating_id,
      weaned_date: null,
    });
  });
});
