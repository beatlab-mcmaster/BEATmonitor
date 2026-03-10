export function isRecord(x) {
  return typeof x === "object" && x !== null;
}
export function hasKeys(obj, keys) {
  return keys.every(k => Object.hasOwn(obj, k));
}
export const isString = x => typeof x === "string";
export const isBoolean = x => typeof x === "boolean";
export const isNumber = x => typeof x === "number" && Number.isFinite(x);
export const isStringArray = x => Array.isArray(x) && x.every(isString);
//# sourceMappingURL=guards.js.map