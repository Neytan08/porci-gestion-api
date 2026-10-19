import prisma from "../../src/prismaClient";
import { BREEDING_SOW_STATUSES } from "../../src/services/breedingSows/breedingSowsRules";
import { PREGNANCY_RESULTS } from "../../src/services/matingEvents/pregnancyRules";
import { createMatingEvent } from "./matingEvents";

/** Prepares a lactating sow, closed pregnancy, and open farrowing as one consistent history fixture. */
export async function createFarrowing(boarId: number) {
  const event = await createMatingEvent({ boarId, pregnancyResult: PREGNANCY_RESULTS.positivo });
  return prisma.$transaction(async (tx) => {
    await tx.matingevents.update({
      where: { mating_id: event.mating_id },
      data: { pregnancy_result: PREGNANCY_RESULTS.cerrado },
    });
    await tx.breedingsows.update({
      where: { sow_id: event.sow_id },
      data: { status: BREEDING_SOW_STATUSES.lactancia, farrowing_number: 1 },
    });
    return tx.farrowings.create({
      data: {
        sow_id: event.sow_id,
        mating_id: event.mating_id,
        farrowing_date: new Date("2024-05-01"),
        male_piglets: 5,
        female_piglets: 4,
      },
    });
  });
}
