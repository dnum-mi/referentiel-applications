const isUpperCase = (word: string) => word === word.toUpperCase() && word !== word.toLowerCase();

export function parseMaiaFullName(fullName: string | null | undefined): { lastname: string; firstname: string } {
  if (!fullName?.trim()) return { lastname: "", firstname: "" };

  const words = fullName.trim().split(/\s+/);

  const lastnameWords: string[] = [];
  const firstnameWords: string[] = [];

  let i = 0;
  while (i < words.length && isUpperCase(words[i])) {
    lastnameWords.push(words[i]);
    i++;
  }
  while (i < words.length && !isUpperCase(words[i])) {
    firstnameWords.push(words[i]);
    i++;
  }

  return {
    lastname: lastnameWords.join(" "),
    firstname: firstnameWords.join(" "),
  };
}
