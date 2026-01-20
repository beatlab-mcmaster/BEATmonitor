import { isRecord, hasKeys, isString, isBoolean, isNumber } from "../utils/guards.js";
export function isDevice(x) {
  if (!isRecord(x)) return false;
  if (!hasKeys(x, ["program", "version", "firmware", "serial", "idMAC", "idShortMAC", "id"])) return false;
  return isString(x.program) && isString(x.version) && isString(x.firmware) && isString(x.serial) && isString(x.idMAC) && isString(x.idShortMAC) && isString(x.id);
}
export function isSettings(x) {
  if (!isRecord(x)) return false;
  if (!hasKeys(x, ["physicalId", "recordHR", "recordAccel", "allowManual", "maxStorage", "minStorage", "maxTrash", "enableHighSpeed", "highSpeedPollRate",
  // "showUI", // TODO: Not currently sent from watch!
  "seatNumber"])) return false;
  return isString(x.physicalId) && isBoolean(x.recordHR) && isBoolean(x.recordAccel) && isBoolean(x.allowManual) && isNumber(x.maxStorage) && isNumber(x.minStorage) && isNumber(x.maxTrash) && isBoolean(x.enableHighSpeed) && isNumber(x.highSpeedPollRate) &&
  // isBoolean(x.showUI) && // TODO: Not currently sent from watch
  isString(x.seatNumber);
}
//# sourceMappingURL=device.js.map