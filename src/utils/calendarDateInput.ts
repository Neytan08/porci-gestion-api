/** Keeps the input's calendar day when converting a date or offset timestamp for @db.Date. */
export const parseCalendarDateInput = (value: string): Date | null => {
  const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const isoTimestamp = /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value);

  if (!usDate && !isoDate && !isoTimestamp) return null;
  if (isoTimestamp && Number.isNaN(Date.parse(value))) return null;

  const year = Number(usDate?.[3] ?? isoDate?.[1] ?? isoTimestamp?.[1]);
  const month = Number(usDate?.[1] ?? isoDate?.[2] ?? isoTimestamp?.[2]);
  const day = Number(usDate?.[2] ?? isoDate?.[3] ?? isoTimestamp?.[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
};
