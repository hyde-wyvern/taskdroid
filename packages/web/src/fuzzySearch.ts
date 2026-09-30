export function fuzzyMatch(query: string, values: string[]): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const fields = values.map(normalize);
  return tokens.every((token) => fields.some((field) => field.includes(token) || isSubsequence(token, field)));
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isSubsequence(needle: string, haystack: string): boolean {
  let index = 0;
  for (const character of haystack) if (character === needle[index]) index += 1;
  return index === needle.length;
}
