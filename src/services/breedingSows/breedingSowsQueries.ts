import { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import {
  BREEDING_SOW_STATUSES,
  type BreedingSowStatus,
  getBreedingSowStatusOrder,
} from "./breedingSowsRules";
import type {
  CreateBreedingSowInput,
  RetireBreedingSowInput,
  UpdateBreedingSowInput,
} from "./breedingSowsTypes";

type BreedingSowsQueryClient = Pick<
  Prisma.TransactionClient,
  "breedingsows" | "$queryRaw"
>;

export const activeBreedingSowWhere = {
  removal_date: null,
  OR: [{ status: null }, { status: { not: BREEDING_SOW_STATUSES.retirada } }],
} satisfies Prisma.breedingsowsWhereInput;

type LockedBreedingSowStatus = {
  sow_id: number;
  status: string | null;
  removal_date: Date | null;
};

/** Returns the active breeding-sow collection with breed data. */
export const getAllBreedingSows = async () => {
  const sows = await prisma.breedingsows.findMany({
    where: activeBreedingSowWhere,
    include: { breed: true },
    orderBy: { sow_id: "asc" },
  });

  return sows
    .map((sow, index) => ({ sow, index }))
    .sort((a, b) => {
      const statusOrder =
        getBreedingSowStatusOrder(a.sow.status) - getBreedingSowStatusOrder(b.sow.status);
      return statusOrder === 0 ? a.index - b.index : statusOrder;
    })
    .map(({ sow }) => sow);
};

/** Retrieves one active breeding sow by id with its breed relationship. */
export const getBreedingSowById = async (id: number) => {
  return await prisma.breedingsows.findFirst({
    where: { AND: [{ sow_id: id }, activeBreedingSowWhere] },
    include: { breed: true },
  });
};

/** Loads an active sow and its current status for reproductive workflows. */
export const getActiveBreedingSowWithStatus = async (
  sowId: number,
  queryClient: BreedingSowsQueryClient = prisma,
) => {
  return await queryClient.breedingsows.findFirst({
    where: { AND: [{ sow_id: sowId }, activeBreedingSowWhere] },
    select: { sow_id: true, status: true },
  });
};

/** Locks one active sow before a reproductive command evaluates or changes its lifecycle. */
export const getActiveBreedingSowWithStatusForUpdate = async (
  sowId: number,
  queryClient: BreedingSowsQueryClient,
) => {
  const sows = await queryClient.$queryRaw<LockedBreedingSowStatus[]>(Prisma.sql`
    SELECT sow_id, status, removal_date
    FROM breedingsows
    WHERE sow_id = ${sowId}
      AND removal_date IS NULL
      AND (status IS NULL OR status <> ${BREEDING_SOW_STATUSES.retirada})
    FOR UPDATE
  `);

  return sows[0] ?? null;
};

/** Locks active sows in identifier order before a batch reproductive transition. */
export const getActiveBreedingSowsWithStatusForUpdate = async (
  sowIds: number[],
  queryClient: BreedingSowsQueryClient,
) => {
  if (sowIds.length === 0) {
    return [];
  }

  const orderedSowIds = [...sowIds].sort((left, right) => left - right);

  return await queryClient.$queryRaw<LockedBreedingSowStatus[]>(Prisma.sql`
    SELECT sow_id, status, removal_date
    FROM breedingsows
    WHERE sow_id IN (${Prisma.join(orderedSowIds)})
      AND removal_date IS NULL
      AND (status IS NULL OR status <> ${BREEDING_SOW_STATUSES.retirada})
    ORDER BY sow_id
    FOR UPDATE
  `);
};

/** Locks a sow regardless of retirement state so deletion can follow the shared lock order. */
export const getBreedingSowStateForUpdate = async (
  sowId: number,
  queryClient: BreedingSowsQueryClient,
) => {
  const sows = await queryClient.$queryRaw<LockedBreedingSowStatus[]>(Prisma.sql`
    SELECT sow_id, status, removal_date
    FROM breedingsows
    WHERE sow_id = ${sowId}
    FOR UPDATE
  `);

  return sows[0] ?? null;
};

/** Finds a sow tag through the same normalized expression enforced by the database index. */
export const getBreedingSowByNormalizedTagNumber = async (
  sowTagNumber: string,
  queryClient: BreedingSowsQueryClient = prisma,
) => {
  const sows = await queryClient.$queryRaw<Array<{ sow_id: number; sow_tag_number: string }>>`
    SELECT sow_id, sow_tag_number
    FROM breedingsows
    WHERE lower(regexp_replace(sow_tag_number, '[[:space:]]+', '', 'g')) =
      lower(regexp_replace(${sowTagNumber}, '[[:space:]]+', '', 'g'))
    LIMIT 1
  `;

  return sows[0] ?? null;
};

/** Returns active breeding sows that match a canonical status value. */
export const getBreedingSowsByStatus = async (
  status: Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada>,
) => {
  return await prisma.breedingsows.findMany({
    where: { AND: [{ status }, activeBreedingSowWhere] },
    include: { breed: true },
  });
};

/** Inserts one breeding sow using only the scalar fields approved by the create contract. */
export const insertBreedingSow = async (
  data: CreateBreedingSowInput,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.create({ data });
};

/** Locks the active state required to validate an ordinary sow update. */
export const getActiveBreedingSowForUpdate = async (
  id: number,
  queryClient: BreedingSowsQueryClient,
) => {
  const sows = await queryClient.$queryRaw<
    Array<{
      sow_id: number;
      entry_date: Date;
      last_weaning_date: Date | null;
      removal_date: Date | null;
      status: string | null;
    }>
  >(Prisma.sql`
    SELECT sow_id, entry_date, last_weaning_date, removal_date, status
    FROM breedingsows
    WHERE sow_id = ${id}
      AND removal_date IS NULL
      AND (status IS NULL OR status <> ${BREEDING_SOW_STATUSES.retirada})
    FOR UPDATE
  `);

  return sows[0] ?? null;
};

/** Applies an ordinary update only while the sow remains active. */
export const updateActiveBreedingSowById = async (
  id: number,
  data: UpdateBreedingSowInput,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.update({
    where: { sow_id: id, ...activeBreedingSowWhere },
    data,
  });
};

/** Deletes a sow only while it remains active. */
export const deleteActiveBreedingSowById = async (
  id: number,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.delete({
    where: { sow_id: id, ...activeBreedingSowWhere },
  });
};

/** Loads every requested sow, including retirement markers, before a retirement batch mutates data. */
export const getBreedingSowsForRetirement = async (
  sowIds: number[],
  queryClient: BreedingSowsQueryClient,
) => {
  if (sowIds.length === 0) {
    return [];
  }

  const orderedSowIds = [...sowIds].sort((left, right) => left - right);

  return await queryClient.$queryRaw<
    Array<{
      sow_id: number;
      entry_date: Date;
      status: string | null;
      removal_date: Date | null;
    }>
  >(Prisma.sql`
    SELECT sow_id, entry_date, status, removal_date
    FROM breedingsows
    WHERE sow_id IN (${Prisma.join(orderedSowIds)})
    ORDER BY sow_id
    FOR UPDATE
  `);
};

/** Marks an active sow batch as retired without changing last-weaning history. */
export const retireActiveBreedingSows = async (
  sowIds: number[],
  removalDate: Date,
  data: RetireBreedingSowInput,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.updateMany({
    where: { AND: [{ sow_id: { in: sowIds } }, activeBreedingSowWhere] },
    data: {
      status: BREEDING_SOW_STATUSES.retirada,
      removal_date: removalDate,
      ...(data.removal_reason !== undefined ? { removal_reason: data.removal_reason } : {}),
    },
  });
};

/** Updates one active sow status inside a caller-owned transaction. */
export const updateActiveBreedingSowStatus = async (
  sowId: number,
  status: BreedingSowStatus,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.update({
    where: { sow_id: sowId, ...activeBreedingSowWhere },
    data: { status },
  });
};

/** Updates the status of active sows affected by a batch reproductive transition. */
export const updateActiveBreedingSowStatuses = async (
  sowIds: number[],
  status: BreedingSowStatus,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.updateMany({
    where: {
      AND: [{ sow_id: { in: sowIds } }, activeBreedingSowWhere],
      NOT: { status },
    },
    data: { status },
  });
};

/** Increments farrowing history and moves a gestating sow into lactation atomically. */
export const applyFarrowingToBreedingSow = async (
  sowId: number,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.updateMany({
    where: {
      AND: [
        { sow_id: sowId, status: BREEDING_SOW_STATUSES.gestacion },
        activeBreedingSowWhere,
      ],
    },
    data: {
      farrowing_number: { increment: 1 },
      status: BREEDING_SOW_STATUSES.lactancia,
    },
  });
};

/** Records a normal weaning and returns an active sow to the empty state. */
export const applyWeaningToBreedingSow = async (
  sowId: number,
  weanedDate: Date,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.update({
    where: {
      sow_id: sowId,
      status: BREEDING_SOW_STATUSES.lactancia,
      ...activeBreedingSowWhere,
    },
    data: {
      status: BREEDING_SOW_STATUSES.vacia,
      last_weaning_date: weanedDate,
    },
  });
};
