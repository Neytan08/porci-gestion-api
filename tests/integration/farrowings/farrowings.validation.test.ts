import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { FARROWING_ERROR_CODES as codes } from "../../../src/services/farrowings/farrowingErrors";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createFarrowing, farrowingPayload } from "../../helpers/farrowings";
import { createMatingEvent } from "../../helpers/matingEvents";

const base = "/api/farrowings";

describe("farrowing request validation", () => {
  it("requires every mandatory creation field", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    for (const field of ["sow_id", "farrowing_date", "male_piglets", "female_piglets"]) {
      const payload: Record<string, unknown> = farrowingPayload(event.sow_id);
      delete payload[field];
      expectApiError(await api.post(base).send(payload), 400, codes.FARROWING_BODY_INVALID);
    }
    expectApiError(await api.post(base), 400, codes.FARROWING_BODY_INVALID);
    expect(await prisma.farrowings.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([event]);
  });

  it("rejects invalid identifiers, count types and numeric boundaries while accepting a safe maximum", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    for (const field of ["male_piglets", "female_piglets", "still_births", "mummies"]) {
      for (const value of [-1, 1.5, null, "2", POSTGRESQL_INTEGER_MAX + 1]) {
        expectApiError(
          await api.post(base).send({ ...farrowingPayload(event.sow_id), [field]: value }),
          400,
          codes.FARROWING_BODY_INVALID,
        );
      }
    }
    for (const patch of [
      { sow_id: 0 },
      { sow_id: "1" },
      { sow_id: POSTGRESQL_INTEGER_MAX + 1 },
      { notes: 12 },
    ]) {
      expectApiError(
        await api.post(base).send({ ...farrowingPayload(event.sow_id), ...patch }),
        400,
        codes.FARROWING_BODY_INVALID,
      );
    }
    expect(await prisma.farrowings.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([event]);
    const response = await api.post(base).send({
      ...farrowingPayload(event.sow_id),
      male_piglets: POSTGRESQL_INTEGER_MAX,
      female_piglets: 0,
      still_births: POSTGRESQL_INTEGER_MAX,
      mummies: POSTGRESQL_INTEGER_MAX,
    });
    expect(response.status).toBe(201);
    expect(await prisma.farrowings.findFirstOrThrow()).toMatchObject({
      male_piglets: POSTGRESQL_INTEGER_MAX,
      female_piglets: 0,
      live_births: POSTGRESQL_INTEGER_MAX,
      still_births: POSTGRESQL_INTEGER_MAX,
      mummies: POSTGRESQL_INTEGER_MAX,
    });
  });

  it("rejects invalid calendar dates on creation and weaning without changing either workflow", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sows = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    const matings = await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } });
    for (const date of ["2023-02-29", "2024-05-01T12:00:00", 20240501]) {
      expectApiError(
        await api.post(base).send({ ...farrowingPayload(event.sow_id), farrowing_date: date }),
        400,
        codes.FARROWING_BODY_INVALID,
      );
      expectApiError(
        await api
          .patch(`${base}/${farrowing.farrowing_id}/wean`)
          .send({ weaned_date: date, weaned_piglets: 8 }),
        400,
        codes.FARROWING_WEAN_BODY_INVALID,
      );
    }
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(sows);
    expect(await prisma.matingevents.findMany({ orderBy: { mating_id: "asc" } })).toEqual(matings);
  });

  it("requires both weaning fields and validates weaned-piglet counts through the integer maximum", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    const valid = { weaned_date: "2024-06-01", weaned_piglets: 8 };
    for (const payload of [{}, { weaned_date: valid.weaned_date }, { weaned_piglets: 8 }]) {
      expectApiError(
        await api.patch(`${base}/${farrowing.farrowing_id}/wean`).send(payload),
        400,
        codes.FARROWING_WEAN_BODY_INVALID,
      );
    }
    expectApiError(
      await api.patch(`${base}/${farrowing.farrowing_id}/wean`),
      400,
      codes.FARROWING_WEAN_BODY_INVALID,
    );
    for (const count of [-1, 1.5, null, "8", POSTGRESQL_INTEGER_MAX + 1]) {
      expectApiError(
        await api
          .patch(`${base}/${farrowing.farrowing_id}/wean`)
          .send({ ...valid, weaned_piglets: count }),
        400,
        codes.FARROWING_WEAN_BODY_INVALID,
      );
    }
    expect(await prisma.farrowings.findMany()).toEqual([farrowing]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
    const response = await api
      .patch(`${base}/${farrowing.farrowing_id}/wean`)
      .send({ ...valid, weaned_piglets: POSTGRESQL_INTEGER_MAX });
    expect(response.status).toBe(200);
    expect(await prisma.farrowings.findFirstOrThrow()).toMatchObject({
      weaned_piglets: POSTGRESQL_INTEGER_MAX,
    });
  });

  it("ignores protected creation fields without allowing injected relationships, generated values or weaning", async () => {
    const event = await createMatingEvent({ pregnancyResult: results.positivo });
    const response = await api.post(base).send({
      ...farrowingPayload(event.sow_id),
      farrowing_id: POSTGRESQL_INTEGER_MAX,
      mating_id: POSTGRESQL_INTEGER_MAX,
      live_births: 99,
      weaning_date: "2030-01-01",
      weaned_date: "2024-05-01",
      weaned_piglets: 99,
      unsupported: true,
      breedingsows: { update: { status: statuses.retirada } },
      matingevents: { create: {} },
    });
    expect(response.status).toBe(201);
    const saved = await prisma.farrowings.findFirstOrThrow();
    expect(saved.farrowing_id).not.toBe(POSTGRESQL_INTEGER_MAX);
    expect(saved).toMatchObject({
      mating_id: event.mating_id,
      live_births: 9,
      weaning_date: new Date("2024-05-31"),
      weaned_date: null,
      weaned_piglets: 0,
    });
    expect(await prisma.matingevents.findMany()).toEqual([
      { ...event, pregnancy_result: results.cerrado },
    ]);
    expect(await prisma.breedingsows.findUnique({ where: { sow_id: event.sow_id } })).toMatchObject(
      { status: statuses.lactancia, removal_date: null, last_weaning_date: null },
    );
  });

  it("ignores unsupported weaning fields and changes only workflow-owned actual-weaning data", async () => {
    const farrowing = await createFarrowing((await createBoar()).boar_id);
    const sow = await prisma.breedingsows.findUniqueOrThrow({
      where: { sow_id: farrowing.sow_id },
    });
    const mating = await prisma.matingevents.findUniqueOrThrow({
      where: { mating_id: farrowing.mating_id },
    });
    const response = await api.patch(`${base}/${farrowing.farrowing_id}/wean`).send({
      weaned_date: "2024-06-01",
      weaned_piglets: 8,
      sow_id: POSTGRESQL_INTEGER_MAX,
      mating_id: POSTGRESQL_INTEGER_MAX,
      farrowing_date: "2030-01-01",
      weaning_date: "2030-02-01",
      male_piglets: 99,
      live_births: 99,
      notes: "Injected",
      breedingsows: { delete: true },
      matingevents: { update: { pregnancy_result: results.positivo } },
    });
    expect(response.status).toBe(200);
    expect(await prisma.farrowings.findMany()).toEqual([
      { ...farrowing, weaned_date: new Date("2024-06-01"), weaned_piglets: 8 },
    ]);
    expect(await prisma.breedingsows.findMany()).toEqual([
      { ...sow, status: statuses.vacia, last_weaning_date: new Date("2024-06-01") },
    ]);
    expect(await prisma.matingevents.findMany()).toEqual([mating]);
  });

  it("preserves the supplied calendar day through creation and weaning for every supported format", async () => {
    for (const date of ["2/29/2024", "2024-02-29", "2024-02-29T23:30:00-06:00"]) {
      const event = await createMatingEvent({ pregnancyResult: results.positivo });
      const created = await api
        .post(base)
        .send({ ...farrowingPayload(event.sow_id), farrowing_date: date });
      expect(created.status).toBe(201);
      expect(created.body.farrowing_date).toBe("2024-02-29T00:00:00.000Z");
      const weaned = await api
        .patch(`${base}/${created.body.farrowing_id}/wean`)
        .send({ weaned_date: date, weaned_piglets: 0 });
      expect(weaned.status).toBe(200);
      expect(weaned.body.weaned_date).toBe("2024-02-29T00:00:00.000Z");
      expect(
        await prisma.farrowings.findUnique({ where: { farrowing_id: created.body.farrowing_id } }),
      ).toMatchObject({
        farrowing_date: new Date("2024-02-29"),
        weaned_date: new Date("2024-02-29"),
      });
      expect(
        await prisma.breedingsows.findUnique({ where: { sow_id: event.sow_id } }),
      ).toMatchObject({ last_weaning_date: new Date("2024-02-29") });
    }
  });
});
