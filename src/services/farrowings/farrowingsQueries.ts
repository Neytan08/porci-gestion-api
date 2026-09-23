import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";

/**
 * Returns the full farrowing collection with the sow data already used by the
 * previous public response.
 */
export const getAllFarrowings = async () => {
  return await prisma.farrowings.findMany({
    include: { breedingsows: true },
  });
};

/**
 * Retrieves one farrowing by id with its related sow.
 */
export const getFarrowingById = async (
  id: number,
  queryClient: Pick<Prisma.TransactionClient, "farrowings"> = prisma,
) => {
  return await queryClient.farrowings.findUnique({
    where: { farrowing_id: id },
    include: { breedingsows: true },
  });
};

/**
 * Returns every farrowing registered for one sow. Empty arrays are valid
 * collection responses and are shaped by the controller/service caller.
 */
export const getFarrowingsBySow = async (sowId: number) => {
  return await prisma.farrowings.findMany({
    where: { sow_id: sowId },
  });
};

/** Loads every unweaned farrowing controlled by a retirement batch. */
export const getActiveFarrowingsBySowIds = async (
  sowIds: number[],
  queryClient: Pick<Prisma.TransactionClient, "farrowings">,
) => {
  return await queryClient.farrowings.findMany({
    where: { sow_id: { in: sowIds }, weaned_date: null },
    select: { farrowing_id: true, sow_id: true },
  });
};

/** Returns the latest farrowing that is still controlled by the weaning workflow. */
export const getActiveFarrowingBySowId = async (
  sowId: number,
  queryClient: Pick<Prisma.TransactionClient, "farrowings"> = prisma,
) => {
  return await queryClient.farrowings.findFirst({
    where: { sow_id: sowId, weaned_date: null },
    select: { farrowing_id: true, weaned_date: true },
    orderBy: { farrowing_id: "desc" },
  });
};

/** Inserts a farrowing inside its reproductive transaction. */
export const insertFarrowing = async (
  data: Prisma.farrowingsUncheckedCreateInput,
  queryClient: Pick<Prisma.TransactionClient, "farrowings">,
) => {
  return await queryClient.farrowings.create({ data });
};

/** Records the normal weaning values for an open farrowing. */
export const updateFarrowingWeaning = async (
  id: number,
  sowId: number,
  farrowingDate: Date,
  weanedDate: Date,
  weanedPiglets: number,
  queryClient: Pick<Prisma.TransactionClient, "farrowings">,
) => {
  return await queryClient.farrowings.update({
    where: { farrowing_id: id, weaned_date: null, sow_id: sowId, farrowing_date: farrowingDate },
    data: { weaned_date: weanedDate, weaned_piglets: weanedPiglets },
  });
};

/** Closes retirement-controlled farrowings without changing sow last-weaning history. */
export const closeFarrowingsForRetirement = async (
  farrowingIds: number[],
  weanedDate: Date,
  queryClient: Pick<Prisma.TransactionClient, "farrowings">,
) => {
  if (farrowingIds.length === 0) {
    return { count: 0 };
  }

  return await queryClient.farrowings.updateMany({
    where: { farrowing_id: { in: farrowingIds }, weaned_date: null },
    data: { weaned_date: weanedDate, weaned_piglets: 0 },
  });
};

/** Deletes one farrowing by id. */
export const deleteFarrowingById = async (id: number) => {
  return await prisma.farrowings.delete({ where: { farrowing_id: id } });
};
