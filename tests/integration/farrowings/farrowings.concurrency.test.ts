import type { Response } from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { FARROWING_ERROR_CODES as codes } from "../../../src/services/farrowings/farrowingErrors";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { runWithDatabaseBarrier } from "../../helpers/concurrency";
import { createFarrowing, farrowingPayload } from "../../helpers/farrowings";
import { createMatingEvent } from "../../helpers/matingEvents";

const base = "/api/farrowings";
const retirement = { removal_date: "2024-06-15", removal_reason: "End of production" };

describe("farrowing concurrency invariants", () => {
  it("creates one farrowing and increments the sow count once when registrations compete", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${event.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.post(base).send({ ...farrowingPayload(event.sow_id), notes: "Winning request" }));
        await wait(1);
        start(api.post(base).send({ ...farrowingPayload(event.sow_id), notes: "Losing request" }));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(201);
    expectApiError(responses[1], 409, codes.SOW_NOT_GESTATING);
    const saved = await prisma.farrowings.findFirstOrThrow();
    expect(await prisma.farrowings.count()).toBe(1);
    expect(JSON.parse(JSON.stringify(saved))).toEqual(responses[0].body);
    expect(saved).toMatchObject({
      mating_id: event.mating_id,
      sow_id: event.sow_id,
      notes: "Winning request",
    });
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.lactancia, farrowing_number: 1 },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...event, pregnancy_result: results.cerrado },
    ]);
  });

  it("records one weaning without letting the losing request overwrite actual values", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${farrowing.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api
            .patch(`${base}/${farrowing.farrowing_id}/wean`)
            .send({ weaned_date: "2024-06-01", weaned_piglets: 0 }),
        );
        await wait(1);
        start(
          api
            .patch(`${base}/${farrowing.farrowing_id}/wean`)
            .send({ weaned_date: "2024-06-02", weaned_piglets: 8 }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 409, codes.FARROWING_ALREADY_WEANED);
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: new Date("2024-06-01"), weaned_piglets: 0 },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.vacia, last_weaning_date: new Date("2024-06-01") },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("preserves completed history when weaning wins before queued deletion", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${farrowing.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api
            .patch(`${base}/${farrowing.farrowing_id}/wean`)
            .send({ weaned_date: "2024-06-01", weaned_piglets: 8 }),
        );
        await wait(1);
        start(api.delete(`${base}/${farrowing.farrowing_id}`));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 409, codes.FARROWING_COMPLETED_DELETE_FORBIDDEN);
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: new Date("2024-06-01"), weaned_piglets: 8 },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.vacia, last_weaning_date: new Date("2024-06-01") },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("preserves the restored pregnancy when deletion wins before queued weaning", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${farrowing.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.delete(`${base}/${farrowing.farrowing_id}`));
        await wait(1);
        start(
          api
            .patch(`${base}/${farrowing.farrowing_id}/wean`)
            .send({ weaned_date: "2024-06-01", weaned_piglets: 8 }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(204);
    expect(responses[0].text).toBe("");
    expectApiError(responses[1], 404, codes.FARROWING_NOT_FOUND);
    expect(await prisma.farrowings.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.gestacion, farrowing_number: 0, last_weaning_date: null },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...mating, pregnancy_result: results.positivo },
    ]);
  });

  it("keeps retirement closure and previous weaning history when retirement wins before normal weaning", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.update({
      where: { sow_id: farrowing.sow_id },
      data: { last_weaning_date: new Date("2023-06-01") },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${farrowing.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api.patch("/api/breedingsows/retire").send({ ...retirement, sow_ids: farrowing.sow_id }),
        );
        await wait(1);
        start(
          api
            .patch(`${base}/${farrowing.farrowing_id}/wean`)
            .send({ weaned_date: "2024-06-01", weaned_piglets: 8 }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 409, codes.SOW_NOT_LACTATING);
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: new Date(retirement.removal_date), weaned_piglets: 0 },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      {
        ...sow,
        status: statuses.retirada,
        removal_date: new Date(retirement.removal_date),
        removal_reason: retirement.removal_reason,
      },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("does not insert a farrowing when sow retirement wins before creation", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) =>
        tx.$queryRaw`SELECT sow_id FROM breedingsows WHERE sow_id = ${event.sow_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.patch("/api/breedingsows/retire").send({ ...retirement, sow_ids: event.sow_id }));
        await wait(1);
        start(api.post(base).send(farrowingPayload(event.sow_id)));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 404, codes.SOW_NOT_FOUND);
    expect(await prisma.farrowings.count()).toBe(0);
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
  });
});
