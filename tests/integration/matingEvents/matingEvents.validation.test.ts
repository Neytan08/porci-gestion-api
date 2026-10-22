import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { MATING_EVENT_ERROR_CODES as codes } from "../../../src/services/matingEvents/matingEventErrors";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { createMatingEvent, matingPayload } from "../../helpers/matingEvents";

const base = "/api/matingevents";
const updatePath = `${base}/update/pregnancy-result`;

describe("mating request validation", () => {
  it("requires every mandatory creation field", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    for (const field of ["sow_id", "reproduction_date", "reproduction_type", "pregnancy_result"]) {
      const payload: Record<string, unknown> = matingPayload(sow.sow_id, boar.boar_id);
      delete payload[field];
      expectApiError(await api.post(base).send(payload), 400, codes.MATING_EVENT_BODY_INVALID);
    }
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });

  it("rejects representative invalid field types, identifiers and formats", async () => {
    const sow = await createBreedingSow();
    const boar = await createBoar();
    const invalidFields: Array<[string, unknown]> = [
      ["sow_id", "1"],
      ["sow_id", 0],
      ["boar_id", POSTGRESQL_INTEGER_MAX + 1],
      ["boar_id", null],
      ["reproduction_date", "2023-02-29"],
      ["reproduction_date", "2024-01-01T12:00:00"],
      ["reproduction_type", "unknown"],
      ["pregnancy_result", null],
      ["notes", 12],
    ];
    for (const [field, value] of invalidFields) {
      expectApiError(
        await api.post(base).send({ ...matingPayload(sow.sow_id, boar.boar_id), [field]: value }),
        400,
        codes.MATING_EVENT_BODY_INVALID,
      );
    }
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects unknown and lifecycle-owned pregnancy results on create and update", async () => {
    const boar = await createBoar();
    const event = await createMatingEvent({ boarId: boar.boar_id });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    for (const pregnancyResult of [
      "unknown",
      "",
      ` ${results.cancelado.toUpperCase()} `,
      results.cerrado,
    ]) {
      expectApiError(
        await api.post(base).send({
          ...matingPayload(event.sow_id, boar.boar_id),
          pregnancy_result: pregnancyResult,
        }),
        400,
        codes.MATING_EVENT_BODY_INVALID,
      );
      expectApiError(
        await api
          .put(updatePath)
          .send({ mating_ids: event.mating_id, pregnancy_result: pregnancyResult }),
        400,
        codes.MATING_EVENT_PREGNANCY_UPDATE_BODY_INVALID,
      );
    }
    expect(await prisma.matingevents.findMany()).toEqual([event]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects unsupported fields and nested writes on both write payloads", async () => {
    const boar = await createBoar();
    const event = await createMatingEvent({ boarId: boar.boar_id });
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    for (const extra of [
      { unsupported: true },
      { mating_id: POSTGRESQL_INTEGER_MAX },
      { breedingsows: { update: { status: "Injected" } } },
      { boars: { create: {} } },
    ]) {
      expectApiError(
        await api.post(base).send({ ...matingPayload(event.sow_id, boar.boar_id), ...extra }),
        400,
        codes.MATING_EVENT_BODY_INVALID,
      );
      expectApiError(
        await api
          .put(updatePath)
          .send({ mating_ids: event.mating_id, pregnancy_result: results.positivo, ...extra }),
        400,
        codes.MATING_EVENT_PREGNANCY_UPDATE_BODY_INVALID,
      );
    }
    expect(await prisma.matingevents.findMany()).toEqual([event]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.boars.count()).toBe(1);
  });

  it("rejects missing, empty, fractional, out-of-range and incorrectly typed update ids", async () => {
    const event = await createMatingEvent();
    const sow = await prisma.breedingsows.findUniqueOrThrow({ where: { sow_id: event.sow_id } });
    for (const ids of [
      undefined,
      [],
      0,
      [1.5],
      [POSTGRESQL_INTEGER_MAX + 1],
      `${event.mating_id}`,
      [event.mating_id, "1"],
      null,
    ]) {
      expectApiError(
        await api.put(updatePath).send({ mating_ids: ids, pregnancy_result: results.positivo }),
        400,
        codes.MATING_EVENT_PREGNANCY_UPDATE_BODY_INVALID,
      );
    }
    expectApiError(
      await api.put(updatePath).send({ mating_ids: event.mating_id }),
      400,
      codes.MATING_EVENT_PREGNANCY_UPDATE_BODY_INVALID,
    );
    expect(await prisma.matingevents.findMany()).toEqual([event]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("persists the supplied calendar day for each supported date format", async () => {
    const boar = await createBoar();
    for (const date of ["2/29/2024", "2024-02-29", "2024-02-29T23:30:00-06:00"]) {
      const sow = await createBreedingSow();
      const response = await api
        .post(base)
        .send({ ...matingPayload(sow.sow_id, boar.boar_id), reproduction_date: date });
      expect(response.status).toBe(201);
      expect(response.body.reproduction_date).toBe("2024-02-29T00:00:00.000Z");
      expect(
        await prisma.matingevents.findUnique({ where: { mating_id: response.body.mating_id } }),
      ).toMatchObject({ reproduction_date: new Date("2024-02-29") });
    }
  });
});
