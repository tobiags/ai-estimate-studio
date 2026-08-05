function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, sortObject(entry)]));
  }
  return value;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortObject(value));
}
