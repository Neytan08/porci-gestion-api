import { expect, it } from "vitest";
import prisma from "../../src/prismaClient";
import { createBoar } from "../helpers/boars";
import { cleanDatabase } from "../helpers/database";
import { createFarrowing } from "../helpers/farrowings";

it("cleans the complete application graph and can prepare new fixtures afterward", async () => {
  const boar = await createBoar();
  await createFarrowing(boar.boar_id);
  await cleanDatabase(prisma);
  expect(
    await Promise.all([
      prisma.breeds.count(),
      prisma.boars.count(),
      prisma.breedingsows.count(),
      prisma.matingevents.count(),
      prisma.farrowings.count(),
    ]),
  ).toEqual([0, 0, 0, 0, 0]);
  await createBoar();
  expect(await prisma.boars.count()).toBe(1);
});
