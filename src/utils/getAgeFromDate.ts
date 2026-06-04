/**
 * Calculates the age in years and months based on the given birth date.
 * @param birthDate - The birth date as a Date object.
 * @returns An object containing years and months.
 */
export function calculateAge(birthDate: Date): { years: number; months: number } {
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months };
}
