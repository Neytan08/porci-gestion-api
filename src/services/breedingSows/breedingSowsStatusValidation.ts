import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { getBlockingMatingEventBySowId } from "../matingEvents/matingEventsQueries";
import { breedingSowErrors } from "./breedingSowErrors";
import { getActiveFarrowingBySowId } from "./breedingSowsQueries";

type ManualStatusChangeQueryClient = Pick<
  Prisma.TransactionClient,
  "breedingsows" | "breed" | "matingevents" | "farrowings"
>;

/**
 * Manual sow status changes are blocked while a MatingEvent (Pending/Positive)
 * or active Farrowing (weaned_date === null) controls the reproductive lifecycle.
 */
export const ensureManualStatusChangeIsAllowed = async (
  sowId: number,
  currentStatus: string | null,
  newStatus: string,
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
