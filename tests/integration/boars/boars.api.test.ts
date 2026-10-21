import { describe, expect, it, vi } from "vitest";
import prisma from "../../../src/prismaClient";
import { BOAR_ERROR_CODES as codes } from "../../../src/services/boars/boarErrors";
import { api, expectApiError } from "../../helpers/api";
import { boarPayload, createBoar } from "../../helpers/boars";
import { createBreed } from "../../helpers/breeds";

const base = "/api/boars";

describe("boar reads", () => {
  it("lists only active boars with breed data and completed age", async () => {
    const active = await createBoar({ birth_date: new Date("2023-06-15") });
    await createBoar({ removal_date: new Date("2024-01-01") });
    await createBoar({ removal_reason: "Legacy retirement" });
    await createBoar({ removal_date: new Date("2024-01-01"), removal_reason: "Retired" });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2024-06-14T12:00:00Z"));
    const response = await api.get(base);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({
        boar_id: active.boar_id,
        breeds: expect.objectContaining({ breed_id: active.breed_id }),
        age: { years: 0, months: 11 },
      }),
    ]);
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
  });
  it("retrieves active and retired boars by id", async () => {
    const active = await createBoar({ birth_date: new Date("2023-06-15") });
    const retired = await createBoar({
      birth_date: new Date("2023-06-15"),
      removal_date: new Date("2024-01-01"),
      removal_reason: "End of production",
    });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2024-06-15T01:00:00Z"));
    for (const boar of [active, retired]) {
      const response = await api.get(`${base}/${boar.boar_id}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        boar_id: boar.boar_id,
        boar_tag_number: boar.boar_tag_number,
        breeds: { breed_id: boar.breed_id },
        age: { years: 1, months: 0 },
        removal_reason: boar.removal_reason,
      });
    }
  });
  it("rejects representative invalid ids across id-based endpoints", async () => {
    const before = await createBoar();
    const responses = await Promise.all([
      api.get(`${base}/abc`),
      api.put(`${base}/0`).send({ description: "changed" }),
      api.delete(`${base}/2147483648`),
    ]);
    for (const response of responses) expectApiError(response, 400, codes.BOAR_ID_INVALID);
    expect(await prisma.boars.findUnique({ where: { boar_id: before.boar_id } })).toEqual(before);
  });
  it("reports nonexistent targets without changing other boars", async () => {
    const removed = await createBoar();
    await prisma.boars.delete({ where: { boar_id: removed.boar_id } });
    const survivor = await createBoar();
    for (const response of await Promise.all([
      api.get(`${base}/${removed.boar_id}`),
      api.put(`${base}/${removed.boar_id}`).send({ description: "changed" }),
      api.delete(`${base}/${removed.boar_id}`),
    ]))
      expectApiError(response, 404, codes.BOAR_NOT_FOUND);
    expect(await prisma.boars.findUnique({ where: { boar_id: survivor.boar_id } })).toEqual(
      survivor,
    );
  });
});

describe("boar creation and profile updates", () => {
  it("persists valid optional fields", async () => {
    const breed = await createBreed();
    const optional = { weight: 0, length: 999.99, description: "Healthy" };
    const payload = { ...boarPayload(breed.breed_id), boar_tag_number: " B 010 ", ...optional };
    const response = await api.post(base).send(payload);
    expect(response.status).toBe(201);
    expect(Object.keys(response.body)).toEqual(["newBoar"]);
    const saved = await prisma.boars.findFirstOrThrow({
      where: { boar_tag_number: payload.boar_tag_number },
    });
    expect(response.body.newBoar).toEqual(JSON.parse(JSON.stringify(saved)));
    expect(saved).toMatchObject({
      breed_id: breed.breed_id,
      birth_date: new Date(payload.birth_date),
      removal_date: null,
      removal_reason: null,
    });
    expect(saved.weight?.toNumber() ?? null).toBe(optional.weight ?? null);
    expect(saved.length?.toNumber() ?? null).toBe(optional.length ?? null);
    expect(saved.description).toBe(optional.description ?? null);
  });
  it("changes supplied profile fields, preserves omitted fields, and clears nullable values", async () => {
    const boar = await createBoar({ weight: 150.25, length: 120.5, description: "Original" });
    const breed = await createBreed();
    const response = await api.put(`${base}/${boar.boar_id}`).send({
      breed_id: breed.breed_id,
      boar_tag_number: "Revised",
      birth_date: "6/16/2023",
      weight: 200.75,
    });
    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(["updatedBoar"]);
    const saved = await prisma.boars.findUniqueOrThrow({ where: { boar_id: boar.boar_id } });
    expect(response.body.updatedBoar).toEqual(JSON.parse(JSON.stringify(saved)));
    expect(saved).toMatchObject({
      breed_id: breed.breed_id,
      boar_tag_number: "Revised",
      birth_date: new Date("2023-06-16"),
      length: boar.length,
      description: "Original",
    });
    expect(saved.weight?.toNumber()).toBe(200.75);
    const cleared = await api
      .put(`${base}/${boar.boar_id}`)
      .send({ weight: null, length: null, description: null });
    expect(cleared.status).toBe(200);
    expect(await prisma.boars.findUnique({ where: { boar_id: boar.boar_id } })).toMatchObject({
      weight: null,
      length: null,
      description: null,
      boar_tag_number: "Revised",
    });
  });
  it("persists a timezone-aware calendar input through create and update", async () => {
      const date = "2024-02-29T23:30:00-06:00";
      const breed = await createBreed();
      const created = await api
        .post(base)
        .send({ ...boarPayload(breed.breed_id), birth_date: date });
      expect(created.status).toBe(201);
      expect(created.body.newBoar.birth_date).toBe("2024-02-29T00:00:00.000Z");
      const boar = await prisma.boars.findFirstOrThrow();
      const updated = await api.put(`${base}/${boar.boar_id}`).send({ birth_date: date });
      expect(updated.status).toBe(200);
      expect(
        (await prisma.boars.findUniqueOrThrow({ where: { boar_id: boar.boar_id } })).birth_date,
      ).toEqual(new Date("2024-02-29"));
  });
  it("ignores protected create fields without permitting nested writes or retirement", async () => {
    const breed = await createBreed();
    const response = await api.post(base).send({
      ...boarPayload(breed.breed_id),
      boar_id: 2147483647,
      removal_date: "2024-01-01",
      removal_reason: "Injected",
      age: { years: 99 },
      breeds: { create: { breed_name: "Injected" } },
      matingevents: { create: {} },
    });
    expect(response.status).toBe(201);
    const saved = await prisma.boars.findFirstOrThrow();
    expect(saved.boar_id).not.toBe(2147483647);
    expect(saved).toMatchObject({ removal_date: null, removal_reason: null });
    expect(await prisma.breeds.count()).toBe(1);
    expect(await prisma.matingevents.count()).toBe(0);
  });
  it("rejects nonexistent breed references for both create and update", async () => {
    const removed = await createBreed();
    await prisma.breeds.delete({ where: { breed_id: removed.breed_id } });
    const boar = await createBoar();
    expectApiError(
      await api.post(base).send(boarPayload(removed.breed_id)),
      404,
      codes.BOAR_BREED_NOT_FOUND,
    );
    expectApiError(
      await api.put(`${base}/${boar.boar_id}`).send({ breed_id: removed.breed_id }),
      404,
      codes.BOAR_BREED_NOT_FOUND,
    );
    expect(await prisma.boars.findMany()).toEqual([boar]);
  });
});

describe("normalized boar tags", () => {
  it("reserves a retired boar's tag across normalized create and update inputs", async () => {
    const owner = await createBoar({
      boar_tag_number: " B 010 ",
      removal_reason: "Retired",
    });
    const other = await createBoar();
    expectApiError(
      await api.post(base).send({ ...boarPayload(owner.breed_id), boar_tag_number: "b010" }),
      409,
      codes.BOAR_TAG_NUMBER_ALREADY_EXISTS,
    );
    expectApiError(
      await api.put(`${base}/${other.boar_id}`).send({ boar_tag_number: " b\t01\n0 " }),
      409,
      codes.BOAR_TAG_NUMBER_ALREADY_EXISTS,
    );
    expect(await prisma.boars.count()).toBe(2);
    expect(await prisma.boars.findUnique({ where: { boar_id: other.boar_id } })).toEqual(other);
  });
  it("lets an active boar retain its own normalized tag", async () => {
    const boar = await createBoar({ boar_tag_number: "B010" });
    const response = await api.put(`${base}/${boar.boar_id}`).send({ boar_tag_number: " b 010 " });
    expect(response.status).toBe(200);
    expect(
      (await prisma.boars.findUniqueOrThrow({ where: { boar_id: boar.boar_id } })).boar_tag_number,
    ).toBe(" b 010 ");
  });
  it("reports normalized tag existence across lifecycle states", async () => {
    await createBoar({ boar_tag_number: "B010" });
    await createBoar({ boar_tag_number: "R010", removal_reason: "Retired" });
    for (const tag of [" b 010 ", "r\t010"]) {
      const response = await api.get(
        `${base}/check-boar-tag-number-exists/${encodeURIComponent(tag)}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toBe(true);
    }
    const absent = await api.get(`${base}/check-boar-tag-number-exists/unused`);
    expect(absent.status).toBe(200);
    expect(absent.body).toBe(false);
    expectApiError(
      await api.get(`${base}/check-boar-tag-number-exists/${encodeURIComponent(" \t ")}`),
      400,
      codes.BOAR_TAG_NUMBER_INVALID,
    );
  });
});
