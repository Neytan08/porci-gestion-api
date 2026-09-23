import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { getActiveFarrowingBySowId } from "../farrowings/farrowingsQueries";
import { getBlockingMatingEventBySowId } from "../matingEvents/matingEventsQueries";
import { breedingSowErrors } from "./breedingSowErrors";
import {
  BREEDING_SOW_STATUSES,
  type BreedingSowStatus,
} from "./breedingSowsRules";

type ManualStatusChangeQueryClient = Pick<
  Prisma.TransactionClient,
  "matingevents" | "farrowings"
>;

/**
 * Manual sow status changes are blocked while a MatingEvent (Pending/Positive)
 * or active Farrowing (weaned_date === null) controls the reproductive lifecycle.
 */
export const ensureManualStatusChangeIsAllowed = async (
  sowId: number,
  currentStatus: string | null,
  newStatus: Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada>,
  queryClient: ManualStatusChangeQueryClient = prisma,
): Promise<void> => {
  if (currentStatus === newStatus) {
    return;
  }

  const blockingMatingEvent = await getBlockingMatingEventBySowId(sowId, queryClient);

  if (blockingMatingEvent) {
    throw breedingSowErrors.manualStatusChangeBlockedByMatingEvent(
      sowId,
      currentStatus,
      newStatus,
    );
  }

  const activeFarrowing = await getActiveFarrowingBySowId(sowId, queryClient);

  if (activeFarrowing) {
    throw breedingSowErrors.manualStatusChangeBlockedByFarrowing(
      sowId,
      currentStatus,
      newStatus,
    );
  }
};
