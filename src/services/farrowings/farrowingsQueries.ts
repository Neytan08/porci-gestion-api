import { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import type { CreateFarrowingInput } from "./farrowingsTypes";

type FarrowingsQueryClient = Pick<Prisma.TransactionClient, "farrowings" | "$queryRaw">;

type LockedFarrowingWorkflowState = {
  farrowing_id: number;
  sow_id: number;
  mating_id: number;
  farrowing_date: Date;
  weaned_date: Date | null;
};

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

/** Resolves immutable relationship ids before a workflow acquires locks in domain order. */
export const getFarrowingWorkflowTarget = async (id: number) => {
  return await prisma.farrowings.findUnique({
    where: { farrowing_id: id },
    select: { farrowing_id: true, sow_id: true, mating_id: true },
  });
};

/** Locks and reloads one farrowing after its sow and any required mating event are locked. */
export const getFarrowingWorkflowStateForUpdate = async (
  id: number,
  queryClient: FarrowingsQueryClient,
) => {
  const farrowings = await queryClient.$queryRaw<LockedFarrowingWorkflowState[]>(Prisma.sql`
    SELECT farrowing_id, sow_id, mating_id, farrowing_date, weaned_date
    FROM farrowings
    WHERE farrowing_id = ${id}
    FOR UPDATE
  `);

  return farrowings[0] ?? null;
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

  return await queryClient.$queryRaw<
    Array<{ farrowing_id: number; sow_id: number; farrowing_date: Date }>
  >(
    Prisma.sql`
      SELECT farrowing_id, sow_id, farrowing_date
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
  data: CreateFarrowingInput & { mating_id: number },
  queryClient: Pick<Prisma.TransactionClient, "farrowings">,
) => {
  return await queryClient.farrowings.create({ data });
};

/** Finds the most recent completed farrowing before deleting the current open record. */
export const getLatestPreviousWeaningDate = async (
  sowId: number,
  excludedFarrowingId: number,
  queryClient: Pick<Prisma.TransactionClient, "farrowings">,
) => {
  const previousFarrowing = await queryClient.farrowings.findFirst({
    where: {
      sow_id: sowId,
      farrowing_id: { not: excludedFarrowingId },
      weaned_date: { not: null },
    },
    select: { weaned_date: true },
    orderBy: { weaned_date: "desc" },
  });

  return previousFarrowing?.weaned_date ?? null;
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

/** Deletes one validated, locked farrowing inside its reproductive transaction. */
export const deleteFarrowingById = async (
  id: number,
  queryClient: Pick<Prisma.TransactionClient, "farrowings">,
) => {
  return await queryClient.farrowings.delete({ where: { farrowing_id: id } });
};
