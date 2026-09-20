import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import type { CreateBoarInput, RetireBoarInput, UpdateBoarInput } from "./boarsTypes";

type BoarsQueryClient = Pick<
  Prisma.TransactionClient,
  "boars" | "breed" | "matingevents" | "$queryRaw"
>;

/**
 * Returns the boar collection with breed data required by the controller response.
 */
export const getAllBoars = async () => {
  return await prisma.boars.findMany({
    where: {
      removal_date: null,
      removal_reason: null,
    },
    include: { breeds: true },
  });
};

/**
 * Retrieves one boar by id with its breed relationship.
 */
export const getBoarById = async (id: number) => {
  return await prisma.boars.findUnique({
    where: { boar_id: id },
    include: { breeds: true },
  });
};

export const getBoarStateById = async (id: number, queryClient: BoarsQueryClient = prisma) =>
  queryClient.boars.findUnique({
    where: { boar_id: id },
    select: { boar_id: true, birth_date: true, removal_date: true, removal_reason: true },
  });

/** Locks the boar while a mating event assigns it, serializing that assignment with retirement. */
export const getBoarStateForAssignment = async (id: number, queryClient: BoarsQueryClient) => {
  const rows = await queryClient.$queryRaw<Array<{
    boar_id: number;
    removal_date: Date | null;
    removal_reason: string | null;
  }>>`
    SELECT boar_id, removal_date, removal_reason
    FROM boars
    WHERE boar_id = ${id}
    FOR UPDATE
  `;
  return rows[0] ?? null;
};

export const getBoarsForRetirement = async (ids: number[], queryClient: BoarsQueryClient) =>
  queryClient.boars.findMany({
    where: { boar_id: { in: ids } },
    select: { boar_id: true, birth_date: true, removal_date: true, removal_reason: true },
  });

/**
 * Checks whether a breed exists before a boar references it.
 */
export const getBoarBreedById = async (breedId: number, queryClient: BoarsQueryClient = prisma) => {
  return await queryClient.breed.findUnique({
    where: { breed_id: breedId },
    select: { breed_id: true },
  });
};

/**
 * Finds a tag using the expression enforced by the manually managed PostgreSQL unique index.
 */
export const getBoarByNormalizedTagNumber = async (
  boarTagNumber: string,
  queryClient: BoarsQueryClient = prisma,
) => {
  const boars = await queryClient.$queryRaw<Array<{ boar_id: number; boar_tag_number: string }>>`
    SELECT boar_id, boar_tag_number
    FROM boars
    WHERE lower(regexp_replace(boar_tag_number, '[[:space:]]+', '', 'g')) =
      lower(regexp_replace(${boarTagNumber}, '[[:space:]]+', '', 'g'))
    LIMIT 1
  `;
  return boars[0] ?? null;
};

export const createBoarRecord = (data: CreateBoarInput, queryClient: BoarsQueryClient) =>
  queryClient.boars.create({ data });

export const updateBoarRecord = (id: number, data: UpdateBoarInput, queryClient: BoarsQueryClient) =>
  queryClient.boars.update({
    where: { boar_id: id, removal_date: null, removal_reason: null },
    data,
  });

export const deleteBoarRecord = (id: number, queryClient: BoarsQueryClient) =>
  queryClient.boars.delete({
    where: { boar_id: id, removal_date: null, removal_reason: null },
  });

export const retireBoarRecords = (
  ids: number[],
  data: RetireBoarInput,
  queryClient: BoarsQueryClient,
) =>
  queryClient.boars.updateMany({
    where: { boar_id: { in: ids }, removal_date: null, removal_reason: null },
    data,
  });

/**
 * Counts related mating events so delete can fail with a business error before
 * Prisma raises a generic foreign-key violation.
 */
export const countBoarMatingEvents = async (
  boarId: number,
  queryClient: BoarsQueryClient = prisma,
) => {
  return await queryClient.matingevents.count({
    where: { boar_id: boarId },
  });
};
