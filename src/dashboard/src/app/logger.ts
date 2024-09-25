/** logger.ts
 * Author: Maya B. Flannery
 * Description: The logger creates standard logs for general information
 * commands and erros. Each log is timestamped and stored in a dated log file.
 * */

import winston from "winston";
const { transports, format, createLogger } = winston;
const { combine, timestamp, printf } = format;

// Custom date for logging files with date of occurance
const date = new Date();
const newdate = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const options = {
  // General logging of server activity is stored in dated log files
  info: {
    level: "info",
    dirname: "logs/combined",
    json: true,
    handleExceptions: true,
    datePattern: "YYYY-MM-DD-HH",
    filename: `combined-${newdate}.log`,
  },
  // Errors are stored in separate dated file
  error: {
    level: "error",
    dirname: "logs/error",
    json: true,
    handleExceptions: true,
    filename: `error-${newdate}.log`,
  },
  // Debug -- not currently used
  console: {
    level: "debug",
    json: false,
    handleExceptions: true,
    colorize: true,
  },
};

const logger = createLogger({
  format: combine(
    timestamp(),
    // Log format:
    printf((info) => `${info.timestamp} - [${info.level}] - ${info.message}`),
  ),
  transports: [
    new transports.File(options.info),
    new transports.File(options.error),
    new transports.Console(options.console),
  ],
  exitOnError: false,
});

export default logger;
