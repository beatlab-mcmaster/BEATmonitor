/** logger.js
 * Author: Maya B. Flannery
 * Created: 2024-03-27
 * Description: Logging types are defined here. Basic usage only. A new log
 * file is created when server.js is started or restarted. All logs are
 * timestamped and stored in either regular 'info' log files, or 'error' log 
 * files. */

import winston from "winston";
const { transports, format, createLogger } = winston;
const { combine, timestamp, printf } = format;

// Custom date for logging files with date of occurance
const date = new Date();
const newdate = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const options = {
  info: {
    level: "info",
    dirname: "logs/combined",
    json: true,
    handleExceptions: true,
    datePattern: "YYYY-MM-DD-HH",
    filename: `combined-${newdate}.log`,
  },
  error: {
    level: "error",
    dirname: "logs/error",
    json: true,
    handleExceptions: true,
    filename: `error-${newdate}.log`,
  },
  console: {
    level: "debug",
    json: false,
    handleExceptions: true,
    colorize: true,
  },
};

const logger = new createLogger({
  format: combine(
    timestamp(),
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
