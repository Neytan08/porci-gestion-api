import prisma from "../../prismaClient";

/** Performs the smallest database query needed to establish application readiness. */
export const checkDatabaseConnection = async () => {
  await prisma.$queryRaw`SELECT 1`;
};
