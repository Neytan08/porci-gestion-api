import type { Prisma } from "@prisma/client";
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

const activeBreedingSowWhere = {
  removal_date: null,
  OR: [{ status: null }, { status: { not: BREEDING_SOW_STATUSES.retirada } }],
} satisfies Prisma.breedingsowsWhereInput;

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

/** Loads the active state required to validate an ordinary sow update. */
export const getActiveBreedingSowForUpdate = async (
  id: number,
  queryClient: BreedingSowsQueryClient,
) => {
  return await queryClient.breedingsows.findFirst({
    where: { AND: [{ sow_id: id }, activeBreedingSowWhere] },
    select: {
      sow_id: true,
      entry_date: true,
      last_weaning_date: true,
      removal_date: true,
      status: true,
    },
  });
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
  return await queryClient.breedingsows.findMany({
    where: { sow_id: { in: sowIds } },
    select: {
      sow_id: true,
      entry_date: true,
      status: true,
      removal_date: true,
    },
  });
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
