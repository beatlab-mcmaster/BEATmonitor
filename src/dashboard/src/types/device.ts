import type { Peripheral } from "@abandonware/noble";

export type Advertising = {
  charging: boolean;
  manual_enabled: boolean;
  accel_enabled: boolean;
  hr_enabled: boolean;
  survey_enabled: boolean;
  storage_cleared: boolean;
  storage_full: boolean;
  trash_full: boolean;
  state: number;
  battery: number;
};

export type Device = {
  program: string;
  version: string;
  firmware: string;
  serial: string;
  idMAC: string;
  idShortMAC: string;
  id: string;
};

export type Settings = {
  physicalId: string;
  recordHR: boolean;
  recordAccel: boolean;
  allowManual: boolean;
  maxStorage: number;
  minStorage: number;
  maxTrash: number;
  enableHighSpeed: boolean;
  highSpeedPollRate: number;
  showUI: boolean;
  seatNumber: string;
};

export type Info = {
  device: Device;
  component: string;
  value: Object | number | boolean | string | string[];
};

export type BinaryDtHrAcc = {
  dt: number; // float64
  hrmBpm: number; // uint8
  hrmConf: number; // uint8
  hrmRaw: number; // uint16
  hrmFilt: number; // uint16
  accX: number; // int8
  accY: number; // int8
  accZ: number; // int8
  accDiff: number; // uint8
  accMag: number; // uint8
};
