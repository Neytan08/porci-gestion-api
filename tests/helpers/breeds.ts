import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../../src/prismaClient";

/** Creates an independent breed fixture; callers can share its identifier explicitly. */
export function createBreed(overrides: Partial<Prisma.breedsCreateInput> = {}) {
  return prisma.breeds.create({ data: { breed_name: `Breed-${randomUUID()}`, ...overrides } });
}
