import prisma from "../../src/prismaClient";
import { BREEDING_SOW_STATUSES } from "../../src/services/breedingSows/breedingSowsRules";
import { REPRODUCTION_TYPES } from "../../src/services/matingEvents/matingEventsTypes";
import {
  PREGNANCY_RESULTS,
  type PregnancyResult,
} from "../../src/services/matingEvents/pregnancyRules";
import { createBoar } from "./boars";
import { createBreedingSow } from "./breedingSows";

/** Builds a natural-mating request for an independently prepared eligible sow. */
export function matingPayload(sowId: number, boarId: number) {
  return {
    sow_id: sowId,
    boar_id: boarId,
    reproduction_date: "2024-01-01",
    reproduction_type: REPRODUCTION_TYPES.naturalMating,
    pregnancy_result: PREGNANCY_RESULTS.pendiente,
  };
}

/** Prepares mating history and a compatible sow status without calling the endpoint under test. */
export async function createMatingEvent(
  options: { boarId?: number; pregnancyResult?: PregnancyResult } = {},
) {
  const boarId = options.boarId ?? (await createBoar()).boar_id;
  const result = options.pregnancyResult ?? PREGNANCY_RESULTS.pendiente;
  const sow = await createBreedingSow({
    status:
      result === PREGNANCY_RESULTS.positivo
        ? BREEDING_SOW_STATUSES.gestacion
        : BREEDING_SOW_STATUSES.vacia,
  });
  return prisma.matingevents.create({
    data: {
      ...matingPayload(sow.sow_id, boarId),
      reproduction_date: new Date("2024-01-01"),
      pregnancy_result: result,
    },
  });
}
