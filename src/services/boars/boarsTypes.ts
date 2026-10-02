export type CreateBoarInput = {
  boar_tag_number: string;
  breed_id: number;
  weight?: number | null;
  length?: number | null;
  birth_date: Date;
  description?: string | null;
};

export type UpdateBoarInput = Partial<CreateBoarInput>;

export type RetireBoarInput = {
  removal_date: Date;
  removal_reason: string;
};
