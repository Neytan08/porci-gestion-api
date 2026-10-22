import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BREEDING_SOW_ERROR_CODES as codes } from "../../../src/services/breedingSows/breedingSowErrors";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { api, expectApiError } from "../../helpers/api";
import { breedingSowPayload, createBreedingSow } from "../../helpers/breedingSows";
import { createBreed } from "../../helpers/breeds";

const base = "/api/breedingsows";

describe("breeding sow reads and writes", () => {
  it("returns an empty collection then orders active sows by status and identifier", async () => {
    const empty = await api.get(base);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);
    const nonproductive = await createBreedingSow({ status: statuses.noProductiva });
    const emptyFirst = await createBreedingSow();
    const lactating = await createBreedingSow({ status: statuses.lactancia });
    const gestating = await createBreedingSow({ status: statuses.gestacion });
    const emptySecond = await createBreedingSow();
    const response = await api.get(base);
    expect(response.status).toBe(200);
    expect(response.body.map((sow: { sow_id: number }) => sow.sow_id)).toEqual([
      gestating.sow_id,
      lactating.sow_id,
      emptyFirst.sow_id,
      emptySecond.sow_id,
      nonproductive.sow_id,
    ]);
  });

  it("filters normalized statuses and excludes a matching sow with a removal date", async () => {
    const target = await createBreedingSow({ status: statuses.gestacion });
    await createBreedingSow();
    await createBreedingSow({ status: statuses.gestacion, removal_date: new Date("2024-06-15") });
    const response = await api.get(`${base}/status/${encodeURIComponent(" GESTACION ")}`);
    expect(response.status).toBe(200);
    expect(response.body.map((sow: { sow_id: number }) => sow.sow_id)).toEqual([target.sow_id]);
    const empty = await api.get(`${base}/status/${statuses.lactancia}`);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);
    expectApiError(
      await api.get(`${base}/status/${statuses.retirada}`),
      400,
      codes.BREEDING_SOW_STATUS_INVALID,
    );
  });

  it("checks normalized tag existence including retired sows and rejects blank input", async () => {
    await createBreedingSow({ sow_tag_number: " S 010 " });
    await createBreedingSow({ sow_tag_number: "OLD", status: statuses.retirada });
    for (const [tag, exists] of [
      ["s\t0\n10", true],
      [" o l d ", true],
      ["missing", false],
    ] as const) {
      const response = await api.get(
        `${base}/check-sow-tag-number-exists/${encodeURIComponent(tag)}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toBe(exists);
    }
    expectApiError(
      await api.get(`${base}/check-sow-tag-number-exists/%20`),
      400,
      codes.BREEDING_SOW_TAG_NUMBER_INVALID,
    );
  });

  it.each([
    { inputStatus: " VACÍA ", status: statuses.vacia, full: true },
    { inputStatus: " no productiva ", status: statuses.noProductiva, full: false },
  ])(
    "registers $status with valid boundary and optional values",
    async ({ inputStatus, status, full }) => {
      const breed = await createBreed();
      const payload = {
        ...breedingSowPayload(breed.breed_id),
        status: inputStatus,
        sow_tag_number: full ? ` ${"S".repeat(48)} ` : "S",
        ...(full
          ? {
              weight: 999.99,
              length: 0,
              mammary_glands: 1,
              farrowing_number: POSTGRESQL_INTEGER_MAX,
              description: "Imported history",
            }
          : {}),
      };
      const response = await api.post(base).send(payload);
      expect(response.status).toBe(201);
      const saved = await prisma.breedingsows.findFirstOrThrow();
      expect(response.body).toEqual(JSON.parse(JSON.stringify(saved)));
      expect(saved).toMatchObject({
        breed_id: breed.breed_id,
        sow_tag_number: payload.sow_tag_number,
        status,
        entry_date: new Date(payload.entry_date),
        mammary_glands: payload.mammary_glands,
        farrowing_number: payload.farrowing_number,
        last_weaning_date: null,
        removal_date: null,
        removal_reason: null,
        description: full ? "Imported history" : null,
      });
      expect(saved.weight?.toString() ?? null).toBe(full ? "999.99" : null);
      expect(saved.length?.toString() ?? null).toBe(full ? "0" : null);
      expect(await prisma.breedingsows.count()).toBe(1);
    },
  );

  it("updates supplied profile fields and clears nullable fields while retaining history", async () => {
    const before = await createBreedingSow({
      description: "Original",
      weight: 150,
      length: 100,
      farrowing_number: 3,
      last_weaning_date: new Date("2024-01-01"),
    });
    const breed = await createBreed();
    const data = {
      breed_id: breed.breed_id,
      sow_tag_number: " Updated S-1 ",
      entry_date: "2023-06-15",
      mammary_glands: 14,
      weight: null,
      length: null,
      description: null,
    };
    const response = await api.put(`${base}/${before.sow_id}`).send(data);
    expect(response.status).toBe(200);
    const expected = { ...before, ...data, entry_date: new Date(data.entry_date) };
    expect(await prisma.breedingsows.findUnique({ where: { sow_id: before.sow_id } })).toEqual(
      expected,
    );
    expect(response.body).toEqual(JSON.parse(JSON.stringify(expected)));
    const repeated = await api.put(`${base}/${before.sow_id}`).send({ mammary_glands: 14 });
    expect(repeated.status).toBe(200);
    expect(repeated.body).toEqual(response.body);
  });

  it("allows a sow to retain its own normalized tag and stores display formatting", async () => {
    const sow = await createBreedingSow({ sow_tag_number: "S010" });
    const expected = { ...sow, sow_tag_number: " s 0\t10 " };
    const response = await api
      .put(`${base}/${sow.sow_id}`)
      .send({ sow_tag_number: expected.sow_tag_number });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(JSON.parse(JSON.stringify(expected)));
    expect(await prisma.breedingsows.findMany()).toEqual([expected]);
  });

  it("rejects equivalent tags owned by active or retired sows without partial writes", async () => {
    const active = await createBreedingSow({ sow_tag_number: " S 010 " });
    const retired = await createBreedingSow({
      sow_tag_number: "OLD",
      status: statuses.retirada,
      removal_date: new Date("2024-01-01"),
    });
    const target = await createBreedingSow({ description: "Unchanged" });
    for (const tag of ["s\t0\n10", " o l d "]) {
      expectApiError(
        await api.post(base).send({ ...breedingSowPayload(active.breed_id), sow_tag_number: tag }),
        409,
        codes.BREEDING_SOW_TAG_NUMBER_ALREADY_EXISTS,
      );
      expectApiError(
        await api
          .put(`${base}/${target.sow_id}`)
          .send({ sow_tag_number: tag, description: "Must not persist" }),
        409,
        codes.BREEDING_SOW_TAG_NUMBER_ALREADY_EXISTS,
      );
    }
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual([
      active,
      retired,
      target,
    ]);
  });

  it("rejects missing breed references on create and update without writes", async () => {
    const removed = await createBreed();
    await prisma.breeds.delete({ where: { breed_id: removed.breed_id } });
    const sow = await createBreedingSow();
    expectApiError(
      await api.post(base).send(breedingSowPayload(removed.breed_id)),
      404,
      codes.BREEDING_SOW_BREED_NOT_FOUND,
    );
    expectApiError(
      await api
        .put(`${base}/${sow.sow_id}`)
        .send({ breed_id: removed.breed_id, description: "Changed" }),
      404,
      codes.BREEDING_SOW_BREED_NOT_FOUND,
    );
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects invalid ids across id-based endpoints before writing", async () => {
    const sow = await createBreedingSow();
    const responses = await Promise.all([
      api.get(`${base}/abc`),
      api.put(`${base}/0`).send({ description: "Changed" }),
      api.delete(`${base}/${POSTGRESQL_INTEGER_MAX + 1}`),
      api.post(`${base}/1.5/validate-status-change`).send({ status: statuses.noProductiva }),
    ]);
    for (const response of responses) expectApiError(response, 400, codes.BREEDING_SOW_ID_INVALID);
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("reports missing targets across reads and mutations without changing another sow", async () => {
    const removed = await createBreedingSow();
    await prisma.breedingsows.delete({ where: { sow_id: removed.sow_id } });
    const survivor = await createBreedingSow();
    const responses = await Promise.all([
      api.get(`${base}/${removed.sow_id}`),
      api.put(`${base}/${removed.sow_id}`).send({ description: "Changed" }),
      api.delete(`${base}/${removed.sow_id}`),
      api
        .post(`${base}/${removed.sow_id}/validate-status-change`)
        .send({ status: statuses.noProductiva }),
    ]);
    for (const response of responses) expectApiError(response, 404, codes.BREEDING_SOW_NOT_FOUND);
    expect(await prisma.breedingsows.findMany()).toEqual([survivor]);
  });
});
