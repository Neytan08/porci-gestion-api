import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { POSTGRESQL_INTEGER_MAX } from "../../../src/schemas_validations/common.schema";
import { BREEDING_SOW_ERROR_CODES as codes } from "../../../src/services/breedingSows/breedingSowErrors";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { api, expectApiError } from "../../helpers/api";
import { breedingSowPayload, createBreedingSow } from "../../helpers/breedingSows";
import { createBreed } from "../../helpers/breeds";

const base = "/api/breedingsows";

describe("breeding sow payload validation", () => {
  it("requires registration fields with the expected types", async () => {
    const breed = await createBreed();
    const valid = breedingSowPayload(breed.breed_id);
    for (const field of Object.keys(valid)) {
      const payload: Record<string, unknown> = { ...valid };
      delete payload[field];
      expectApiError(await api.post(base).send(payload), 400, codes.BREEDING_SOW_BODY_INVALID);
    }
    for (const payload of [
      { ...valid, entry_date: 20230101 },
      { ...valid, description: 123 },
      { ...valid, status: null },
    ]) {
      expectApiError(await api.post(base).send(payload), 400, codes.BREEDING_SOW_BODY_INVALID);
    }
    expect(await prisma.breedingsows.count()).toBe(0);
  });

  it("rejects blank, overlong and nonstring tags on create and update", async () => {
    const sow = await createBreedingSow();
    for (const tag of ["", " \t\n ", "S".repeat(51), 123]) {
      expectApiError(
        await api.post(base).send({ ...breedingSowPayload(sow.breed_id), sow_tag_number: tag }),
        400,
        codes.BREEDING_SOW_BODY_INVALID,
      );
      expectApiError(
        await api.put(`${base}/${sow.sow_id}`).send({ sow_tag_number: tag }),
        400,
        codes.BREEDING_SOW_UPDATE_BODY_INVALID,
      );
    }
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects workflow-owned, unknown or null statuses on create and update", async () => {
    const sow = await createBreedingSow();
    for (const status of [
      statuses.gestacion,
      statuses.lactancia,
      statuses.retirada,
      "unknown",
      "",
      null,
    ]) {
      expectApiError(
        await api.post(base).send({ ...breedingSowPayload(sow.breed_id), status }),
        400,
        codes.BREEDING_SOW_BODY_INVALID,
      );
      expectApiError(
        await api.put(`${base}/${sow.sow_id}`).send({ status }),
        400,
        codes.BREEDING_SOW_UPDATE_BODY_INVALID,
      );
    }
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("accepts null measurements and rejects negative, excessive or imprecise values", async () => {
    const breed = await createBreed();
    const response = await api.post(base).send({
      ...breedingSowPayload(breed.breed_id),
      weight: null,
      length: null,
      description: null,
    });
    expect(response.status).toBe(201);
    const sow = await prisma.breedingsows.findFirstOrThrow();
    expect(sow).toMatchObject({ weight: null, length: null, description: null });
    for (const field of ["weight", "length"]) {
      for (const value of [-0.01, 1000, 1.001, "150"]) {
        expectApiError(
          await api.post(base).send({ ...breedingSowPayload(breed.breed_id), [field]: value }),
          400,
          codes.BREEDING_SOW_BODY_INVALID,
        );
        expectApiError(
          await api.put(`${base}/${sow.sow_id}`).send({ [field]: value }),
          400,
          codes.BREEDING_SOW_UPDATE_BODY_INVALID,
        );
      }
    }
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("enforces database integer limits for references, glands and imported farrowing counts", async () => {
    const sow = await createBreedingSow();
    for (const field of ["breed_id", "mammary_glands", "farrowing_number"]) {
      const invalidValues =
        field === "farrowing_number"
          ? [-1, 1.5, POSTGRESQL_INTEGER_MAX + 1, "1"]
          : [0, -1, 1.5, POSTGRESQL_INTEGER_MAX + 1, "1"];
      for (const value of invalidValues) {
        expectApiError(
          await api.post(base).send({ ...breedingSowPayload(sow.breed_id), [field]: value }),
          400,
          codes.BREEDING_SOW_BODY_INVALID,
        );
        if (field !== "farrowing_number") {
          expectApiError(
            await api.put(`${base}/${sow.sow_id}`).send({ [field]: value }),
            400,
            codes.BREEDING_SOW_UPDATE_BODY_INVALID,
          );
        }
      }
    }
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("accepts supported calendar formats and rejects impossible or ambiguous dates", async () => {
    const sow = await createBreedingSow();
    for (const entry_date of ["6/15/2023", "2023-06-15", "2023-06-15T23:30:00-06:00"]) {
      const response = await api
        .post(base)
        .send({ ...breedingSowPayload(sow.breed_id), entry_date });
      expect(response.status).toBe(201);
      expect(response.body.entry_date).toBe("2023-06-15T00:00:00.000Z");
    }
    const before = await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } });
    for (const entry_date of ["2023-02-29", "2023-13-01", "2023-06-15T12:00:00", "", null]) {
      expectApiError(
        await api.post(base).send({ ...breedingSowPayload(sow.breed_id), entry_date }),
        400,
        codes.BREEDING_SOW_BODY_INVALID,
      );
      expectApiError(
        await api.put(`${base}/${sow.sow_id}`).send({ entry_date }),
        400,
        codes.BREEDING_SOW_UPDATE_BODY_INVALID,
      );
    }
    expect(await prisma.breedingsows.findMany({ orderBy: { sow_id: "asc" } })).toEqual(before);
  });

  it("rejects protected fields and nested writes even beside valid profile fields", async () => {
    const sow = await createBreedingSow();
    for (const protectedField of [
      { sow_id: sow.sow_id },
      { last_weaning_date: "2024-01-01" },
      { removal_date: "2024-06-15" },
      { removal_reason: "Bypass retirement" },
      { breeds: { connect: { breed_id: sow.breed_id } } },
      { matingevents: { deleteMany: {} } },
      { farrowings: { deleteMany: {} } },
      { unknown: true },
    ]) {
      expectApiError(
        await api.post(base).send({ ...breedingSowPayload(sow.breed_id), ...protectedField }),
        400,
        codes.BREEDING_SOW_BODY_INVALID,
      );
      expectApiError(
        await api.put(`${base}/${sow.sow_id}`).send({ description: "Changed", ...protectedField }),
        400,
        codes.BREEDING_SOW_UPDATE_BODY_INVALID,
      );
    }
    expectApiError(
      await api.put(`${base}/${sow.sow_id}`).send({ farrowing_number: 4 }),
      400,
      codes.BREEDING_SOW_UPDATE_BODY_INVALID,
    );
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.farrowings.count()).toBe(0);
  });

  it("rejects invalid retirement selections without retiring valid members", async () => {
    const sow = await createBreedingSow();
    for (const sow_ids of [
      undefined,
      [],
      0,
      "1",
      [sow.sow_id, -1],
      [sow.sow_id, 1.5],
      [sow.sow_id, POSTGRESQL_INTEGER_MAX + 1],
    ]) {
      expectApiError(
        await api.patch(`${base}/retire`).send({ sow_ids, removal_date: "2024-06-15" }),
        400,
        codes.BREEDING_SOW_RETIRE_BODY_INVALID,
      );
    }
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects invalid retirement dates, reasons and unsupported fields", async () => {
    const sow = await createBreedingSow();
    for (const invalid of [
      { removal_date: "2024-02-30" },
      { removal_date: null },
      { removal_reason: 123 },
      { status: statuses.retirada },
    ]) {
      expectApiError(
        await api.patch(`${base}/retire`).send({ sow_ids: sow.sow_id, ...invalid }),
        400,
        codes.BREEDING_SOW_RETIRE_BODY_INVALID,
      );
    }
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("validates the proposed status and rejects additional fields during prevalidation", async () => {
    const sow = await createBreedingSow();
    for (const payload of [
      {},
      { status: null },
      { status: statuses.gestacion },
      { status: statuses.lactancia },
      { status: statuses.retirada },
      { status: "unknown" },
      { status: statuses.noProductiva, description: "Changed" },
    ]) {
      expectApiError(
        await api.post(`${base}/${sow.sow_id}/validate-status-change`).send(payload),
        400,
        codes.BREEDING_SOW_STATUS_CHANGE_BODY_INVALID,
      );
    }
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });

  it("rejects an empty update and preserves the existing sow", async () => {
    const sow = await createBreedingSow({ description: "Unchanged" });
    expectApiError(
      await api.put(`${base}/${sow.sow_id}`).send({}),
      400,
      codes.BREEDING_SOW_UPDATE_BODY_INVALID,
    );
    expect(await prisma.breedingsows.findMany()).toEqual([sow]);
  });
});
