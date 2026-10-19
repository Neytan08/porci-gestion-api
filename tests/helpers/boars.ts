import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../../src/prismaClient";
import { createBreed } from "./breeds";

/** Supplies an independent, valid HTTP payload without concealing fields a test is exercising. */
export function boarPayload(breedId: number) {
  return { breed_id: breedId, boar_tag_number: `B-${randomUUID()}`, birth_date: "2023-06-15" };
}

/** Creates an active boar or an explicitly overridden lifecycle fixture through real Prisma. */
export async function createBoar(overrides: Partial<Prisma.boarsUncheckedCreateInput> = {}) {
  const breedId = overrides.breed_id ?? (await createBreed()).breed_id;
  return prisma.boars.create({
    data: {
      ...boarPayload(breedId),
      birth_date: new Date("2023-06-15"),
      ...overrides,
    },
  });
}
