import type { Response } from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BOAR_ERROR_CODES as codes } from "../../../src/services/boars/boarErrors";
import { MATING_EVENT_ERROR_CODES as matingCodes } from "../../../src/services/matingEvents/matingEventErrors";
import { api, expectApiError } from "../../helpers/api";
import { boarPayload, createBoar } from "../../helpers/boars";
import { createBreedingSow } from "../../helpers/breedingSows";
import { createBreed } from "../../helpers/breeds";
import { runWithDatabaseBarrier } from "../../helpers/concurrency";
import { matingPayload } from "../../helpers/matingEvents";

const retirement = { removal_date: "2024-06-15", removal_reason: "End of production" };

describe("boar concurrency invariants", () => {
  it("preserves normalized uniqueness for competing create and update writes", async () => {
    const breed = await createBreed();
    const second = await createBoar({ breed_id: breed.breed_id });
    const responses = await runWithDatabaseBarrier<Response>(
      // Reads pass; both writes wait after their availability checks, exercising the database index.
      (tx) => tx.$executeRaw`LOCK TABLE boars IN SHARE MODE`,
      async (start, wait) => {
        start(
          api
            .post("/api/boars")
            .send({ ...boarPayload(breed.breed_id), boar_tag_number: "RACE" }),
        );
        start(api.put(`/api/boars/${second.boar_id}`).send({ boar_tag_number: " r a c e " }));
        await wait(2);
      },
    );
    expect(responses.filter(({ status }) => status === 200 || status === 201)).toHaveLength(1);
    const conflict = responses.find(({ status }) => status === 409);
    expect(conflict).toBeDefined();
    if (conflict) expectApiError(conflict, 409, codes.BOAR_TAG_NUMBER_ALREADY_EXISTS);
    const matches = await prisma.$queryRaw<Array<{ boar_id: number }>>`
      SELECT boar_id FROM boars WHERE lower(regexp_replace(boar_tag_number, '[[:space:]]+', '', 'g')) = 'race'
    `;
    expect(matches).toHaveLength(1);
  });
  it("serializes overlapping retirement batches in reverse input order", async () => {
    const first = await createBoar();
    const second = await createBoar();
    const third = await createBoar();
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT boar_id FROM boars WHERE boar_id = ${first.boar_id} FOR UPDATE`,
      async (start, wait) => {
        start(
          api
            .patch("/api/boars/retire")
            .send({ ...retirement, boar_ids: [second.boar_id, first.boar_id] }),
        );
        await wait(1);
        start(
          api.patch("/api/boars/retire").send({
            ...retirement,
            removal_reason: "Losing request",
            boar_ids: [third.boar_id, first.boar_id, second.boar_id],
          }),
        );
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expect(responses[0].body).toEqual({ count: 2 });
    expectApiError(responses[1], 409, codes.BOAR_ALREADY_RETIRED);
    for (const id of [first.boar_id, second.boar_id]) {
      expect(await prisma.boars.findUnique({ where: { boar_id: id } })).toMatchObject({
        removal_reason: retirement.removal_reason,
      });
    }
    expect(await prisma.boars.findUnique({ where: { boar_id: third.boar_id } })).toEqual(third);
  });
  it.each(["update", "assign"] as const)(
    "rejects %s queued behind retirement",
    async (operation) => {
      const boar = await createBoar();
      const sow = await createBreedingSow();
      const responses = await runWithDatabaseBarrier<Response>(
        (tx) => tx.$queryRaw`SELECT boar_id FROM boars WHERE boar_id = ${boar.boar_id} FOR UPDATE`,
        async (start, wait) => {
          start(api.patch("/api/boars/retire").send({ ...retirement, boar_ids: boar.boar_id }));
          await wait(1);
          start(
            operation === "update"
              ? api
                  .put(`/api/boars/${boar.boar_id}`)
                  .send({ birth_date: "2025-01-01", description: "Changed" })
              : api.post("/api/matingevents").send(matingPayload(sow.sow_id, boar.boar_id)),
          );
          await wait(2);
        },
      );
      expect(responses[0].status).toBe(200);
      expectApiError(
        responses[1],
        409,
        operation === "assign" ? matingCodes.BOAR_RETIRED : codes.BOAR_ALREADY_RETIRED,
      );
      expect(await prisma.boars.findUnique({ where: { boar_id: boar.boar_id } })).toEqual({
        ...boar,
        removal_date: new Date(retirement.removal_date),
        removal_reason: retirement.removal_reason,
      });
      expect(await prisma.matingevents.count()).toBe(0);
      expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
    },
  );
  it("revalidates birth date when its update commits before retirement", async () => {
    const boar = await createBoar();
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT boar_id FROM boars WHERE boar_id = ${boar.boar_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.put(`/api/boars/${boar.boar_id}`).send({ birth_date: "2025-01-01" }));
        await wait(1);
        start(api.patch("/api/boars/retire").send({ ...retirement, boar_ids: boar.boar_id }));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(200);
    expectApiError(responses[1], 400, codes.BOAR_REMOVAL_DATE_BEFORE_BIRTH_DATE);
    expect(await prisma.boars.findUnique({ where: { boar_id: boar.boar_id } })).toMatchObject({
      birth_date: new Date("2025-01-01"),
      removal_date: null,
      removal_reason: null,
    });
  });
  it("preserves a mating assignment that wins against deletion", async () => {
    const boar = await createBoar();
    const sow = await createBreedingSow();
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT boar_id FROM boars WHERE boar_id = ${boar.boar_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.post("/api/matingevents").send(matingPayload(sow.sow_id, boar.boar_id)));
        await wait(1);
        start(api.delete(`/api/boars/${boar.boar_id}`));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(201);
    expectApiError(responses[1], 409, codes.BOAR_HAS_MATING_EVENTS);
    expect(await prisma.matingevents.findMany()).toEqual([
      expect.objectContaining({ boar_id: boar.boar_id, sow_id: sow.sow_id }),
    ]);
    expect(await prisma.boars.findUnique({ where: { boar_id: boar.boar_id } })).not.toBeNull();
  });
  it("rejects a mating assignment queued behind deletion", async () => {
    const boar = await createBoar();
    const sow = await createBreedingSow();
    const responses = await runWithDatabaseBarrier<Response>(
      (tx) => tx.$queryRaw`SELECT boar_id FROM boars WHERE boar_id = ${boar.boar_id} FOR UPDATE`,
      async (start, wait) => {
        start(api.delete(`/api/boars/${boar.boar_id}`));
        await wait(1);
        start(api.post("/api/matingevents").send(matingPayload(sow.sow_id, boar.boar_id)));
        await wait(2);
      },
    );
    expect(responses[0].status).toBe(204);
    expectApiError(responses[1], 404, matingCodes.BOAR_NOT_FOUND);
    expect(await prisma.matingevents.count()).toBe(0);
    expect(await prisma.breedingsows.findUnique({ where: { sow_id: sow.sow_id } })).toEqual(sow);
  });
});
