import type { Response } from "supertest";
import { describe, expect, it } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREED_ERROR_CODES as codes } from "../../../src/services/breeds/breedErrors";
import { api, expectApiError } from "../../helpers/api";
import { createBreed } from "../../helpers/breeds";
import { runWithDatabaseBarrier } from "../../helpers/concurrency";

describe("breed concurrency invariants", () => {
  it("preserves normalized uniqueness for competing create and update writes", async () => {
    const target = await createBreed({ description: "Original" });
    const responses = await runWithDatabaseBarrier<Response>(
      // Reads pass; both writes wait after availability checks so the index resolves the race.
      (tx) => tx.$executeRaw`LOCK TABLE breeds IN SHARE MODE`,
      async (start, wait) => {
        start(api.post("/api/breeds").send({ breed_name: "RACE" }));
        start(api.put(`/api/breeds/${target.breed_id}`).send({ breed_name: " r a\tc\ne " }));
        await wait(2);
      },
    );
    expect(responses.filter(({ status }) => status === 200 || status === 201)).toHaveLength(1);
    const conflict = responses.find(({ status }) => status === 409);
    expect(conflict).toBeDefined();
    if (conflict) expectApiError(conflict, 409, codes.BREED_NAME_ALREADY_EXISTS);
    const matches = await prisma.$queryRaw<Array<{ breed_id: number }>>`
      SELECT breed_id FROM breeds
      WHERE lower(regexp_replace(breed_name, '[[:space:]]+', '', 'g')) = 'race'
    `;
    expect(matches).toHaveLength(1);
    const savedTarget = await prisma.breeds.findUniqueOrThrow({
      where: { breed_id: target.breed_id },
    });
    if (responses[1].status === 409) {
      expect(savedTarget).toEqual(target);
      expect(await prisma.breeds.count()).toBe(2);
    } else {
      expect(savedTarget).toEqual({ ...target, breed_name: " r a\tc\ne " });
      expect(await prisma.breeds.count()).toBe(1);
    }
  });
});
