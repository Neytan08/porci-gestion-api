/**
 * Calculates the age in years and months based on the given birth date.
 * @param birthDate - The birth date as a Date object.
 * @returns An object containing years and months.
 */
export function calculateAge(birthDate: Date): { years: number; months: number } {
  const today = new Date();
  const completedMonths =
    (today.getFullYear() - birthDate.getUTCFullYear()) * 12 +
    today.getMonth() -
    birthDate.getUTCMonth() -
    (today.getDate() < birthDate.getUTCDate() ? 1 : 0);

  return {
    years: Math.floor(completedMonths / 12),
    months: ((completedMonths % 12) + 12) % 12,
  };
}
