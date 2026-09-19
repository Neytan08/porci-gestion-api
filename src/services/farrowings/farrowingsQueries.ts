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
