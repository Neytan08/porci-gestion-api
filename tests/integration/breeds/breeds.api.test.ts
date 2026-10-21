import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BREED_ERROR_CODES as codes } from "../../../src/services/breeds/breedErrors";
import { BREEDING_SOW_STATUSES } from "../../../src/services/breedingSows/breedingSowsRules";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { createBreed } from "../../helpers/breeds";

const base = "/api/breeds";

describe("breed reads and writes", () => {
  it("returns the plural breed relationship across sow read endpoints", async () => {
    const breed = await createBreed({ description: "Maternal line" });
    const sow = await createBreedingSow({ breed_id: breed.breed_id });
    for (const endpoint of [
      "/api/breedingsows",
      `/api/breedingsows/${sow.sow_id}`,
      `/api/breedingsows/status/${BREEDING_SOW_STATUSES.vacia}`,
    ]) {
      const response = await api.get(endpoint);
      expect(response.status).toBe(200);
      const records = Array.isArray(response.body) ? response.body : [response.body];
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        sow_id: sow.sow_id,
        breed_id: breed.breed_id,
        breeds: breed,
      });
      expect(records[0]).not.toHaveProperty("breed");
    }
  });

  it("returns an empty catalog, then lists and retrieves the created breeds", async () => {
    const empty = await api.get(base);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);
    const first = await createBreed({ description: "Maternal line" });
    const second = await createBreed();
    const listed = await api.get(base);
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(2);
    expect(listed.body).toEqual(expect.arrayContaining([first, second]));
    for (const breed of [first, second]) {
      const response = await api.get(`${base}/${breed.breed_id}`);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(breed);
    }
  });

  it.each([
    { breed_name: ` ${"D".repeat(48)} `, description: "Terminal line" },
    { breed_name: "D" },
  ])("persists valid boundary input %j without altering the display name", async (payload) => {
    const response = await api.post(base).send(payload);
    expect(response.status).toBe(201);
    const saved = await prisma.breeds.findFirstOrThrow();
    expect(response.body).toEqual(saved);
    expect(saved).toEqual({
      breed_id: expect.any(Number),
      breed_name: payload.breed_name,
      description: payload.description ?? null,
    });
    expect(await prisma.breeds.count()).toBe(1);
  });

  it("changes only supplied fields during partial updates", async () => {
    const breed = await createBreed({ description: "Original" });
    const renamed = { ...breed, breed_name: ` ${"L".repeat(48)} ` };
    const first = await api
      .put(`${base}/${breed.breed_id}`)
      .send({ breed_name: renamed.breed_name });
    expect(first.status).toBe(200);
    expect(first.body).toEqual(renamed);
    expect(await prisma.breeds.findUnique({ where: { breed_id: breed.breed_id } })).toEqual(
      renamed,
    );
    const updated = { ...renamed, description: "Updated" };
    const second = await api
      .put(`${base}/${breed.breed_id}`)
      .send({ description: updated.description });
    expect(second.status).toBe(200);
    expect(second.body).toEqual(updated);
    expect(await prisma.breeds.findUnique({ where: { breed_id: breed.breed_id } })).toEqual(
      updated,
    );
  });

  it("allows a breed to retain its own equivalent name and stores its display formatting", async () => {
    const breed = await createBreed({ breed_name: "Duroc" });
    const expected = { ...breed, breed_name: " d u r o c " };
    const response = await api
      .put(`${base}/${breed.breed_id}`)
      .send({ breed_name: expected.breed_name });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expected);
    expect(await prisma.breeds.findMany()).toEqual([expected]);
  });

  it("rejects equivalent names on create and update without changing existing breeds", async () => {
    const owner = await createBreed({ breed_name: " Large White " });
    const other = await createBreed({ description: "Unchanged" });
    expectApiError(
      await api.post(base).send({ breed_name: "largewhite" }),
      409,
      codes.BREED_NAME_ALREADY_EXISTS,
    );
    expectApiError(
      await api.put(`${base}/${other.breed_id}`).send({
        breed_name: " lArGe\tWhi\nte ",
        description: "Must not persist",
      }),
      409,
      codes.BREED_NAME_ALREADY_EXISTS,
    );
    const saved = await prisma.breeds.findMany();
    expect(saved).toHaveLength(2);
    expect(saved).toEqual(expect.arrayContaining([owner, other]));
  });

  it("rejects representative invalid ids across id-based endpoints without writes", async () => {
    const before = await createBreed();
    const responses = await Promise.all([
      api.get(`${base}/abc`),
      api.put(`${base}/0`).send({ description: "Changed" }),
      api.delete(`${base}/${POSTGRESQL_INTEGER_MAX + 1}`),
    ]);
    for (const response of responses) expectApiError(response, 400, codes.BREED_ID_INVALID);
    expect(await prisma.breeds.findMany()).toEqual([before]);
  });

  it("reports missing targets across reads, updates and deletes without affecting another breed", async () => {
    const removed = await createBreed();
    await prisma.breeds.delete({ where: { breed_id: removed.breed_id } });
    const survivor = await createBreed();
    const responses = await Promise.all([
      api.get(`${base}/${removed.breed_id}`),
      api.put(`${base}/${removed.breed_id}`).send({ description: "Changed" }),
      api.delete(`${base}/${removed.breed_id}`),
    ]);
    for (const response of responses) expectApiError(response, 404, codes.BREED_NOT_FOUND);
    expect(await prisma.breeds.findMany()).toEqual([survivor]);
  });
});

describe("breed deletion and animal references", () => {
  it("deletes only the unused target with an empty 204 response", async () => {
    const target = await createBreed();
    const survivor = await createBreed();
    const response = await api.delete(`${base}/${target.breed_id}`);
    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(await prisma.breeds.findMany()).toEqual([survivor]);
  });

  it.each([
    { animal: "boar", retired: false },
    { animal: "boar", retired: true },
    { animal: "sow", retired: false },
    { animal: "sow", retired: true },
  ])("preserves a breed referenced by $animal (retired=$retired)", async ({ animal, retired }) => {
    const breed = await createBreed();
    const retirement = retired
      ? { removal_date: new Date("2024-06-15"), removal_reason: "End of production" }
      : {};
    const boar =
      animal === "boar" ? await createBoar({ breed_id: breed.breed_id, ...retirement }) : null;
    const sow =
      animal === "sow"
        ? await createBreedingSow({
            breed_id: breed.breed_id,
            status: retired ? BREEDING_SOW_STATUSES.retirada : BREEDING_SOW_STATUSES.vacia,
            ...retirement,
          })
        : null;
    expectApiError(
      await api.delete(`${base}/${breed.breed_id}`),
      409,
      codes.BREED_HAS_RELATED_ANIMALS,
    );
    expect(await prisma.breeds.findMany()).toEqual([breed]);
    expect(await prisma.boars.findMany()).toEqual(boar ? [boar] : []);
    expect(await prisma.breedingsows.findMany()).toEqual(sow ? [sow] : []);
  });
});
