/** Scalar fields accepted when creating a breed, without nested animal writes. */
export type CreateBreedInput = {
  breed_name: string;
  description?: string | null;
};

/** Omitted fields retain their current values during a breed update. */
export type UpdateBreedInput = Partial<CreateBreedInput>;
