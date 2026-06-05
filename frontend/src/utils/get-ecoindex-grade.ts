export const getEcoIndexGrade = (ecoIndex: number): string => {
  if (ecoIndex > 80) return "A";
  if (ecoIndex > 70) return "B";
  if (ecoIndex > 55) return "C";
  if (ecoIndex > 40) return "D";
  if (ecoIndex > 25) return "E";
  if (ecoIndex > 10) return "F";
  return "G";
};
