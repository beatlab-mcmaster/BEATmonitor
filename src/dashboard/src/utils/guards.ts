export type UnknownRecord = Record<string, unknown>;

export function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === "object" && x !== null;
}

export function hasKeys<K extends string>(
  obj: UnknownRecord,
  keys: readonly K[],
): obj is UnknownRecord & Record<K, unknown> {
  return keys.every((k) => Object.hasOwn(obj, k));
}

export const isString = (x: unknown): x is string => typeof x === "string";
export const isBoolean = (x: unknown): x is boolean => typeof x === "boolean";
export const isNumber = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);

export const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every(isString);
