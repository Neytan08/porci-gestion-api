import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import type { CreateBreedInput, UpdateBreedInput } from "./breedTypes";

type BreedsQueryClient = Pick<
  Prisma.TransactionClient,
  "breed" | "boars" | "breedingsows" | "$queryRaw"
>;

export type BreedRelatedAnimalsCount = {
  boars: number;
  breedingSows: number;
};

/**
 * Returns the full breed collection.
 */
export const getAllBreeds = async () => {
  return await prisma.breed.findMany();
};

/**
 * Retrieves one breed by its identifier.
 */
export const getBreedById = async (id: number, queryClient: BreedsQueryClient = prisma) => {
  return await queryClient.breed.findUnique({
    where: { breed_id: id },
  });
};

/** Persists only the scalar fields owned by a breed inside the supplied transaction. */
export const insertBreed = async (data: CreateBreedInput, queryClient: BreedsQueryClient) => {
  return await queryClient.breed.create({
    data: { breed_name: data.breed_name, description: data.description },
  });
};

/** Updates supplied breed fields without exposing nested animal mutations. */
export const updateBreedById = async (
  id: number,
  data: UpdateBreedInput,
  queryClient: BreedsQueryClient,
) => {
  return await queryClient.breed.update({
    where: { breed_id: id },
    data: { breed_name: data.breed_name, description: data.description },
  });
};

/** Deletes a breed after its command has checked relationship constraints. */
export const deleteBreedById = async (id: number, queryClient: BreedsQueryClient) => {
  return await queryClient.breed.delete({ where: { breed_id: id } });
};

/**
 * Finds a name using the expression required by the manually managed unique index,
 * ignoring casing and all whitespace while preserving the stored display name.
 */
export const getBreedByNormalizedName = async (
  breedName: string,
  queryClient: BreedsQueryClient = prisma,
) => {
  const breeds = await queryClient.$queryRaw<Array<{ breed_id: number; breed_name: string }>>`
    SELECT breed_id, breed_name
    FROM breed
    WHERE lower(regexp_replace(breed_name, '[[:space:]]+', '', 'g')) =
      lower(regexp_replace(${breedName}, '[[:space:]]+', '', 'g'))
    LIMIT 1
  `;

  return breeds[0] ?? null;
};

/**
 * Counts animals that still reference a breed before delete.
 */
export const countBreedRelatedAnimals = async (
  breedId: number,
  queryClient: BreedsQueryClient = prisma,
): Promise<BreedRelatedAnimalsCount> => {
  const [boars, breedingSows] = await Promise.all([
    queryClient.boars.count({ where: { breed_id: breedId } }),
    queryClient.breedingsows.count({ where: { breed_id: breedId } }),
  ]);

  return { boars, breedingSows };
};
