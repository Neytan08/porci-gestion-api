import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { FARROWING_ERROR_CODES as codes } from "../../../src/services/farrowings/farrowingErrors";
import { REPRODUCTION_TYPES as types } from "../../../src/services/matingEvents/matingEventsTypes";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { createFarrowing, farrowingPayload } from "../../helpers/farrowings";
import { createMatingEvent } from "../../helpers/matingEvents";

const base = "/api/farrowings";

describe("farrowing history reads", () => {
  it("lists and retrieves open and completed retired-sow history with related sow data", async () => {
    const empty = await api.get(base);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);
    const boar = await createBoar();
    const open = await createFarrowing(boar.boar_id);
    const fixture = await createFarrowing(boar.boar_id);
    const completed = await prisma.farrowings.update({
      where: { farrowing_id: fixture.farrowing_id },
      data: { weaned_date: new Date("2024-06-01"), weaned_piglets: 8 },
    });
    await prisma.breedingsows.update({
      where: { sow_id: fixture.sow_id },
      data: {
        status: statuses.retirada,
        removal_date: new Date("2024-06-15"),
        last_weaning_date: new Date("2024-06-01"),
      },
    });
    const expected = [];
    for (const farrowing of [open, completed]) {
      const sow = await prisma.breedingsows.findUniqueOrThrow({
        where: { sow_id: farrowing.sow_id },
      });
      const record = JSON.parse(JSON.stringify({ ...farrowing, breedingsows: sow }));
      expected.push(record);
      const response = await api.get(`${base}/${farrowing.farrowing_id}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(record);
    }
    const response = await api.get(base);
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(expect.arrayContaining(expected));
  });

  it("filters sow history with accurate counts and empty results for absent history", async () => {
    const boar = await createBoar();
    const open = await createFarrowing(boar.boar_id);
    const mating = await prisma.matingevents.create({
      data: {
        sow_id: open.sow_id,
        boar_id: boar.boar_id,
        reproduction_date: new Date("2023-01-01"),
        reproduction_type: types.naturalMating,
        pregnancy_result: results.cerrado,
      },
    });
    const previous = await prisma.farrowings.create({
      data: {
        sow_id: open.sow_id,
        mating_id: mating.mating_id,
        farrowing_date: new Date("2023-05-01"),
        male_piglets: 4,
        female_piglets: 4,
        weaned_date: new Date("2023-06-01"),
        weaned_piglets: 8,
      },
    });
    await prisma.breedingsows.update({
      where: { sow_id: open.sow_id },
      data: { farrowing_number: 2, last_weaning_date: previous.weaned_date },
    });
    await createFarrowing(boar.boar_id);
    const response = await api.get(`${base}/sow/${open.sow_id}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      sowId: open.sow_id,
      count: 2,
      farrowings: expect.arrayContaining(JSON.parse(JSON.stringify([open, previous]))),
    });
    expect(response.body.farrowings).toHaveLength(2);
    const emptySow = await createBreedingSow();
    for (const id of [emptySow.sow_id, POSTGRESQL_INTEGER_MAX]) {
      const empty = await api.get(`${base}/sow/${id}`);
      expect(empty.status).toBe(200);
      expect(empty.body).toEqual({ sowId: id, count: 0, farrowings: [] });
    }
  });

  it("rejects representative invalid identifiers without changing the reproductive graph", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    for (const response of [
      await api.get(`${base}/abc`),
      await api.delete(`${base}/0`),
      await api
        .patch(`${base}/${POSTGRESQL_INTEGER_MAX + 1}/wean`)
        .send({ weaned_date: "2024-06-01", weaned_piglets: 8 }),
    ])
      expectApiError(response, 400, codes.FARROWING_ID_INVALID);
    expectApiError(await api.get(`${base}/sow/1.5`), 400, codes.SOW_ID_INVALID);
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("reports nonexistent retrieve, wean and delete targets without changing existing records", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    for (const response of [
      await api.get(`${base}/${POSTGRESQL_INTEGER_MAX}`),
      await api.delete(`${base}/${POSTGRESQL_INTEGER_MAX}`),
      await api
        .patch(`${base}/${POSTGRESQL_INTEGER_MAX}/wean`)
        .send({ weaned_date: "2024-06-01", weaned_piglets: 8 }),
    ])
      expectApiError(response, 404, codes.FARROWING_NOT_FOUND);
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });
});

describe("farrowing creation", () => {
  it("persists supplied information and generated fields while completing the pregnancy lifecycle", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.update({
      where: { sow_id: event.sow_id },
      data: { farrowing_number: 3, last_weaning_date: new Date("2023-06-01") },
    });
    const payload = {
      ...farrowingPayload(event.sow_id),
      still_births: 2,
      mummies: 1,
      notes: "Normal farrowing",
    };
    const response = await api.post(base).send(payload);
    expect(response.status).toBe(201);
    const saved = await prisma.farrowings.findFirstOrThrow();
    expect(response.body).toEqual(JSON.parse(JSON.stringify(saved)));
    expect(saved).toMatchObject({
      ...payload,
      farrowing_date: new Date(payload.farrowing_date),
      mating_id: event.mating_id,
      live_births: 9,
      weaning_date: new Date("2024-05-31"),
      weaned_date: null,
      weaned_piglets: 0,
    });
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...event, pregnancy_result: results.cerrado },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.lactancia, farrowing_number: 4 },
    ]);
  });

  it("accepts zero births and defaults omitted stillbirths and mummies without completing weaning", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const response = await api
      .post(base)
      .send({ ...farrowingPayload(event.sow_id), male_piglets: 0, female_piglets: 0 });
    expect(response.status).toBe(201);
    expect(await prisma.farrowings.findMany()).toEqual([
      expect.objectContaining({
        farrowing_id: response.body.farrowing_id,
        male_piglets: 0,
        female_piglets: 0,
        live_births: 0,
        still_births: 0,
        mummies: 0,
        notes: null,
        weaning_date: new Date("2024-05-31"),
        weaned_date: null,
      }),
    ]);
    expect(await prisma.breedingsows.findUnique({ where: { sow_id: event.sow_id } })).toMatchObject(
      { status: statuses.lactancia, farrowing_number: 1, last_weaning_date: null },
    );
  });

  it("rejects missing sows and either retirement marker without changing their mating history", async () => {
    expectApiError(
      await api.post(base).send(farrowingPayload(POSTGRESQL_INTEGER_MAX)),
      404,
      codes.SOW_NOT_FOUND,
    );
    for (const retirement of [
      { status: statuses.retirada },
      { removal_date: new Date("2024-06-01") },
    ]) {
      const event = await createMatingEvent({ pregnancyResult: results.positivo });
      const sow = await prisma.breedingsows.update({
        where: { sow_id: event.sow_id },
        data: retirement,
      });
      expectApiError(
        await api.post(base).send(farrowingPayload(event.sow_id)),
        404,
        codes.SOW_NOT_FOUND,
      );
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: event.sow_id } })).toEqual(
        sow,
      );
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
    }
    expect(await prisma.farrowings.count()).toBe(0);
  });

  it("rejects non-gestating sows even when a positive mating exists", async () => {
    for (const status of [statuses.vacia, statuses.lactancia, statuses.noProductiva]) {
      const event = await createMatingEvent({ pregnancyResult: results.positivo });
      const sow = await prisma.breedingsows.update({
        where: { sow_id: event.sow_id },
        data: { status },
      });
      expectApiError(
        await api.post(base).send(farrowingPayload(event.sow_id)),
        409,
        codes.SOW_NOT_GESTATING,
      );
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: event.sow_id } })).toEqual(
        sow,
      );
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
    }
    expect(await prisma.farrowings.count()).toBe(0);
  });

  it("requires positive active mating history for a gestating sow", async () => {
    const missing = await createBreedingSow({ status: statuses.gestacion });
    expectApiError(
      await api.post(base).send(farrowingPayload(missing.sow_id)),
      409,
      codes.POSITIVE_MATING_EVENT_NOT_FOUND,
    );
    expect(await prisma.breedingsows.findUnique({ where: { sow_id: missing.sow_id } })).toEqual(
      missing,
    );
    for (const pregnancyResult of [
      results.pendiente,
      results.negativo,
      results.cancelado,
      results.cerrado,
    ]) {
      const event = await createMatingEvent({ pregnancyResult });
      const sow = await prisma.breedingsows.update({
        where: { sow_id: event.sow_id },
        data: { status: statuses.gestacion },
      });
      expectApiError(
        await api.post(base).send(farrowingPayload(event.sow_id)),
        409,
        codes.POSITIVE_MATING_EVENT_NOT_FOUND,
      );
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: event.mating_id } }),
      ).toEqual(event);
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: event.sow_id } })).toEqual(
        sow,
      );
    }
    expect(await prisma.farrowings.count()).toBe(0);
  });

  it("rejects farrowing dates before or equal to reproduction without closing the pregnancy", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    for (const date of ["2023-12-31", "2024-01-01"]) {
      expectApiError(
        await api.post(base).send({ ...farrowingPayload(event.sow_id), farrowing_date: date }),
        400,
        codes.FARROWING_DATE_BEFORE_REPRODUCTION,
      );
    }
    expect(await prisma.farrowings.count()).toBe(0);
    expect(await prisma.matingevents.findMany()).toEqual([event]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rolls back the inserted farrowing and pregnancy closure if the final counter increment overflows", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.update({
      where: { sow_id: event.sow_id },
      data: { farrowing_number: POSTGRESQL_INTEGER_MAX },
    });
    const response = await api.post(base).send(farrowingPayload(event.sow_id));
    expectApiError(response, 500, "PERSISTENCE_ERROR");
    expect(await prisma.farrowings.count()).toBe(0);
    expect(await prisma.matingevents.findMany()).toEqual([event]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });
});
