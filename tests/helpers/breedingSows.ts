import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../../src/prismaClient";
import { BREEDING_SOW_STATUSES } from "../../src/services/breedingSows/breedingSowsRules";
import { createBreed } from "./breeds";

/** Supplies an independent registration payload while leaving tested fields explicit. */
export function breedingSowPayload(breedId: number) {
  return {
    breed_id: breedId,
    sow_tag_number: `S-${randomUUID()}`,
    entry_date: "2023-01-01",
    status: BREEDING_SOW_STATUSES.vacia,
    mammary_glands: 12,
    farrowing_number: 0,
  };
}

/** Creates a sow eligible for a new reproductive workflow unless explicitly overridden. */
export async function createBreedingSow(
  overrides: Partial<Prisma.breedingsowsUncheckedCreateInput> = {},
) {
  const breedId = overrides.breed_id ?? (await createBreed()).breed_id;
  return prisma.breedingsows.create({
    data: {
      breed_id: breedId,
      sow_tag_number: `S-${randomUUID()}`,
      entry_date: new Date("2023-01-01"),
      status: BREEDING_SOW_STATUSES.vacia,
      mammary_glands: 12,
      farrowing_number: 0,
      ...overrides,
    },
  });
}
