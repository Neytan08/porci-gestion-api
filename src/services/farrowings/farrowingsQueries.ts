import { Prisma } from "@prisma/client";
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

/** Locks every unweaned farrowing after retirement has locked its sows and mating events. */
export const getActiveFarrowingsBySowIds = async (
  sowIds: number[],
  queryClient: Pick<Prisma.TransactionClient, "farrowings" | "$queryRaw">,
) => {
  if (sowIds.length === 0) {
    return [];
  }

  const orderedSowIds = [...sowIds].sort((left, right) => left - right);

  return await queryClient.$queryRaw<Array<{ farrowing_id: number; sow_id: number }>>(
    Prisma.sql`
      SELECT farrowing_id, sow_id
      FROM farrowings
      WHERE sow_id IN (${Prisma.join(orderedSowIds)})
        AND weaned_date IS NULL
      ORDER BY sow_id, farrowing_id
      FOR UPDATE
    `,
  );
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
