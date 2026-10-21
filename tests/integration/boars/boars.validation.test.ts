import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BOAR_ERROR_CODES as codes } from "../../../src/services/boars/boarErrors";
import { api, expectApiError } from "../../helpers/api";
import { boarPayload, createBoar } from "../../helpers/boars";
import { createBreed } from "../../helpers/breeds";

const invalidFields: Array<[string, unknown]> = [
  ["boar_tag_number", ""],
  ["breed_id", POSTGRESQL_INTEGER_MAX + 1],
  ["weight", 1000],
  ["birth_date", "2023-02-29"],
  ["birth_date", "2024-01-01T12:00:00"],
];

describe("boar profile validation", () => {
  it.each(invalidFields)("rejects representative invalid %s=%j on create", async (field, value) => {
    const breed = await createBreed();
    expectApiError(
      await api.post("/api/boars").send({ ...boarPayload(breed.breed_id), [field]: value }),
      400,
      codes.BOAR_BODY_INVALID,
    );
    expect(await prisma.boars.count()).toBe(0);
  });
  it("applies the shared field validation on update", async () => {
    const before = await createBoar();
    expectApiError(
      await api.put(`/api/boars/${before.boar_id}`).send({ weight: "100" }),
      400,
      codes.BOAR_UPDATE_BODY_INVALID,
    );
    expect(await prisma.boars.findMany()).toEqual([before]);
  });
  it("requires the identifying fields at creation", async () => {
    for (const field of ["boar_tag_number", "breed_id", "birth_date"]) {
      const breed = await createBreed();
      const payload: Record<string, unknown> = boarPayload(breed.breed_id);
      delete payload[field];
      expectApiError(await api.post("/api/boars").send(payload), 400, codes.BOAR_BODY_INVALID);
      expect(await prisma.boars.count()).toBe(0);
      await prisma.breeds.deleteMany();
    }
  });
  it.each([
    {},
    { unsupported: true },
  ])("rejects empty or unsupported update %j", async (payload) => {
    const before = await createBoar();
    expectApiError(
      await api.put(`/api/boars/${before.boar_id}`).send(payload),
      400,
      codes.BOAR_UPDATE_BODY_INVALID,
    );
    expect(await prisma.boars.findMany()).toEqual([before]);
  });
  it("accepts the maximum tag length and decimal boundaries", async () => {
    const breed = await createBreed();
    const response = await api.post("/api/boars").send({
      ...boarPayload(breed.breed_id),
      boar_tag_number: "B".repeat(50),
      weight: 999.99,
      length: 0,
    });
    expect(response.status).toBe(201);
    const boar = await prisma.boars.findFirstOrThrow();
    expect(boar.boar_tag_number).toHaveLength(50);
    expect(boar.weight?.toNumber()).toBe(999.99);
    expect(boar.length?.toNumber()).toBe(0);
  });
  it("rejects missing bodies and malformed JSON through the actual middleware", async () => {
    const boar = await createBoar();
    expectApiError(await api.post("/api/boars"), 400, codes.BOAR_BODY_INVALID);
    expectApiError(
      await api.put(`/api/boars/${boar.boar_id}`),
      400,
      codes.BOAR_UPDATE_BODY_INVALID,
    );
    expectApiError(await api.patch("/api/boars/retire"), 400, codes.BOAR_RETIRE_BODY_INVALID);
    expectApiError(
      await api.post("/api/boars").set("Content-Type", "application/json").send('{"birth_date":'),
      400,
      "INVALID_JSON_BODY",
    );
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });
});

describe("boar retirement validation", () => {
  it.each([
    undefined,
    [],
    [1.5],
    [POSTGRESQL_INTEGER_MAX + 1],
  ])("rejects invalid retirement ids %j", async (ids) => {
    const before = await createBoar();
    expectApiError(
      await api
        .patch("/api/boars/retire")
        .send({ boar_ids: ids, removal_date: "2024-01-01", removal_reason: "Retired" }),
      400,
      codes.BOAR_RETIRE_BODY_INVALID,
    );
    expect(await prisma.boars.findMany()).toEqual([before]);
  });
  it.each([
    { removal_reason: undefined },
    { removal_reason: " \t " },
    { removal_date: "2024-02-30" },
    { extra: true },
  ])("rejects invalid retirement fields %j", async (patch) => {
    const before = await createBoar();
    expectApiError(
      await api.patch("/api/boars/retire").send({
        boar_ids: before.boar_id,
        removal_date: "2024-01-01",
        removal_reason: "Retired",
        ...patch,
      }),
      400,
      codes.BOAR_RETIRE_BODY_INVALID,
    );
    expect(await prisma.boars.findMany()).toEqual([before]);
  });
});
