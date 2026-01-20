import winston from "winston";
import path from "path";
import fs from "fs";

export type LogLevel =
  | "info"
  | "warn"
  | "error"
  | "timeSync"
  | "osc"
  | "rsa"
  | "rssi";

// --- Custom levels and colors ---

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    osc: 2,
    info: 3,
    rssi: 4,
    rsa: 5,
    timeSync: 6,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "green",
    rssi: "blue",
    rsa: "magenta",
    osc: "red",
    timeSync: "blue",
  },
};

winston.addColors(customLevels.colors);

// --- Create folder for today's logs ---
const today = new Date().toISOString().split("T")[0];
const logDir = path.join("logs", today);
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

// --- Helper: ISO timestamp with milliseconds ---
const timestampWithMs = winston.format((info) => {
  const now = new Date();
  const date = now.toISOString().replace("T", " ").replace("Z", "");
  info.timestamp = date; // e.g. "2025-10-29 16:41:32.123"
  return info;
});

// --- Common file format ---
const fileFormat = winston.format.combine(
  timestampWithMs(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }),
);

// --- Console format with colors and ms timestamps ---
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  timestampWithMs(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  }),
);

// --- Helper: filter only a given level ---
const filterOnly = (level: string) =>
  winston.format((info) => (info.level === level ? info : false))();

// --- Winston logger ---
export const logger = winston.createLogger({
  levels: customLevels.levels,
  transports: [
    // Console: only error, warn, info (colored)
    new winston.transports.Console({
      level: "info",
      format: consoleFormat,
    }),

    // File transports for main levels
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "warn.log"),
      level: "warn",
      format: fileFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "info.log"),
      level: "info",
      format: fileFormat,
    }),

    // File transports for rssi and rsa (only those levels)
    new winston.transports.File({
      filename: path.join(logDir, "rssi.log"),
      level: "rssi",
      format: winston.format.combine(filterOnly("rssi"), fileFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "rsa.log"),
      level: "rsa",
      format: winston.format.combine(filterOnly("rsa"), fileFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "osc.log"),
      level: "osc",
      format: winston.format.combine(filterOnly("osc"), fileFormat),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "timeSync.log"),
      level: "timeSync",
      format: winston.format.combine(filterOnly("timeSync"), fileFormat),
    }),
  ],
});
