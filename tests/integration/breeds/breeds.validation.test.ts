import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREED_ERROR_CODES as codes } from "../../../src/services/breeds/breedErrors";
import { api, expectApiError } from "../../helpers/api";
import { createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { createBreed } from "../../helpers/breeds";

const base = "/api/breeds";

describe("breed payload validation", () => {
  it.each([
    { label: "empty", payload: {} },
    { label: "unsupported-only", payload: { unsupported: true, boars: { deleteMany: {} } } },
  ])("rejects $label updates without changing the breed", async ({ payload }) => {
    const before = await createBreed({ description: "Unchanged" });
    expectApiError(
      await api.put(`${base}/${before.breed_id}`).send(payload),
      400,
      codes.BREED_UPDATE_BODY_INVALID,
    );
    expect(await prisma.breeds.findMany()).toEqual([before]);
  });

  it.each([
    { label: "missing name", payload: {} },
    { label: "empty name", payload: { breed_name: "" } },
    { label: "whitespace-only name", payload: { breed_name: " \t\n " } },
    { label: "overlong name", payload: { breed_name: "D".repeat(51) } },
    { label: "nonstring name", payload: { breed_name: 123 } },
  ])("rejects $label without creating a breed", async ({ payload }) => {
    expectApiError(await api.post(base).send(payload), 400, codes.BREED_BODY_INVALID);
    expect(await prisma.breeds.count()).toBe(0);
  });

  it("rejects null and nonstring descriptions at the HTTP boundary", async () => {
    for (const description of [null, 123]) {
      expectApiError(
        await api.post(base).send({ breed_name: "Duroc", description }),
        400,
        codes.BREED_BODY_INVALID,
      );
      expect(await prisma.breeds.count()).toBe(0);
    }
  });

  it("validates supplied update fields and preserves the existing breed on rejection", async () => {
    const before = await createBreed({ description: "Original" });
    expectApiError(
      await api
        .put(`${base}/${before.breed_id}`)
        .send({ breed_name: "D".repeat(51), description: "Changed" }),
      400,
      codes.BREED_UPDATE_BODY_INVALID,
    );
    expect(await prisma.breeds.findMany()).toEqual([before]);
  });

  it("strips protected ids and nested animal writes from create and update", async () => {
    const existing = await createBreed();
    const boar = await createBoar({ breed_id: existing.breed_id });
    const sow = await createBreedingSow({ breed_id: existing.breed_id });
    const created = await api.post(base).send({
      breed_id: existing.breed_id,
      breed_name: "Duroc",
      boars: { connect: { boar_id: boar.boar_id } },
      breedingsows: { connect: { sow_id: sow.sow_id } },
    });
    expect(created.status).toBe(201);
    const target = await prisma.breeds.findUniqueOrThrow({ where: { breed_name: "Duroc" } });
    expect(created.body).toEqual(target);
    expect(target.breed_id).not.toBe(existing.breed_id);
    const updated = await api.put(`${base}/${target.breed_id}`).send({
      breed_id: existing.breed_id,
      description: "Editable field",
      boars: { connect: { boar_id: boar.boar_id } },
      breedingsows: { connect: { sow_id: sow.sow_id } },
    });
    expect(updated.status).toBe(200);
    const expected = { ...target, description: "Editable field" };
    expect(updated.body).toEqual(expected);
    const breeds = await prisma.breeds.findMany();
    expect(breeds).toHaveLength(2);
    expect(breeds).toEqual(expect.arrayContaining([existing, expected]));
    expect(await prisma.boars.findMany()).toEqual([boar]);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });
});
