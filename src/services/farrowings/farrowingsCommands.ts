import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { isPrismaRecordNotFoundError } from "../../utils/prismaErrors";
import { BREEDING_SOW_STATUSES } from "../breedingSows/breedingSowsRules";
import { getBlockingMatingEventBySowId, getSowByIdWithStatus } from "../matingEvents/matingEventsQueries";
import { PREGNANCY_RESULTS } from "../matingEvents/pregnancyRules";
import { farrowingErrors } from "./farrowingErrors";

export type CreateFarrowingInput = Omit<
  Prisma.farrowingsUncheckedCreateInput,
  "mating_id" | "weaning_date" | "live_births" | "weaned_piglets"
>;

/**
 * A farrowing can only close a pregnancy that was confirmed as positive. Once
 * the record is created, that mating event is closed and the sow enters the
 * lactation stage in the same transaction.
 */
export const createFarrowing = async (data: CreateFarrowingInput) => {
  return await prisma.$transaction(async (tx) => {
    const sow = await getSowByIdWithStatus(data.sow_id, tx);

    if (!sow) {
      throw farrowingErrors.sowNotFound(data.sow_id);
    }

    if (sow.status !== BREEDING_SOW_STATUSES.gestacion) {
      throw farrowingErrors.sowNotGestating(data.sow_id, sow.status);
    }

    const matingEvent = await getBlockingMatingEventBySowId(data.sow_id, tx);

    if (!matingEvent || matingEvent.pregnancy_result !== PREGNANCY_RESULTS.positivo) {
      throw farrowingErrors.positiveMatingEventNotFound(data.sow_id);
    }

    const farrowing = await tx.farrowings.create({
      data: {
        ...data,
        mating_id: matingEvent.mating_id,
      },
    });

    await tx.matingevents.update({
      where: { mating_id: matingEvent.mating_id },
      data: { pregnancy_result: PREGNANCY_RESULTS.cerrado },
    });

    const updatedSow = await tx.breedingsows.updateMany({
      where: {
        sow_id: data.sow_id,
        status: BREEDING_SOW_STATUSES.gestacion,
      },
      data: {
        farrowing_number: { increment: 1 },
        status: BREEDING_SOW_STATUSES.lactancia,
      },
    });

    if (updatedSow.count !== 1) {
      throw farrowingErrors.sowStatusUpdateFailed(data.sow_id);
    }

    return farrowing;
  });
};

/**
 * Updates direct farrowing fields. When the farrowing date changes, the weaning
 * date is recalculated because it is derived business data, not client input.
 */
export const updateFarrowing = async (id: number, data: Prisma.farrowingsUncheckedUpdateInput) => {
  try {
    return await prisma.farrowings.update({
      where: { farrowing_id: id },
      data: data,
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw farrowingErrors.farrowingNotFound(id, "update");
    }

    throw error;
  }
};

/**
 * Removes a farrowing record by id. Status restoration is intentionally not
 * inferred here because the current business rules only define creation effects.
 */
export const deleteFarrowing = async (id: number) => {
  try {
    return await prisma.farrowings.delete({
      where: { farrowing_id: id },
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw farrowingErrors.farrowingNotFound(id, "delete");
    }
    throw error;
  }
};
