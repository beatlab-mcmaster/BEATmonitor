/** config.ts
 * Author: Maya B. Flannery
 * Description: Configure global variables in this single file. Settings are
 * divided into Directories, Server settings, and Parameters for synchronizing
 * watch time. */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Get root path for app
const __dirname = join(dirname(fileURLToPath(import.meta.url)), "../");

const settings = {
  // Directory settings
  directory: {
    // .json files are created when Bangle.js watches are found
    watchList: join(__dirname, "watchData/watchList/"),
    // .csv files are created when data are transferred from watches
    transferredData: join(__dirname, "watchData/transferredData/"),
  },

  // Server settings
  port: 3001, // Change port if it conflicts with another local process
  routePublic: join(__dirname, "public"),
  routeNodeModules: join(__dirname, "node_modules"),
  index: join(__dirname, "public/dashboard.html"),

  // Time syncronization settings
  syncronizationTrials: 15, // The optimal sych offset will be estimated from n trials
  // Estimated delay (ms) from server time to setTime on watch; starting value
  // of 100 ms was determined in testing
  startOffset: 100,
  setTrialAverage: 5, // The final offset will be calcualed from the last n trials
  watchDelay: 5, // The estimated delay (ms) for the watch to process setTime and prepare response;
  driftPollingInterval: 5000, // Attempt to get drift every 10 seconds
  // Verified above in testing  TODO: document test procedure

  /* Bangle.js 2 Bluetooth settings 
  UUIDs are used in bluetooth protocol to identify the services, 
  characteristics, and attributes of a device. The uuids here are preset and
  unique to Bangle.js/Espurino */
  uuid: {
    btUARTService: "6e400001b5a3f393e0a9e50e24dcca9e", // Nordic UART Service UUID
    txCharacteristic: "6e400002b5a3f393e0a9e50e24dcca9e",
    rxCharacteristic: "6e400003b5a3f393e0a9e50e24dcca9e",
  },
  // Delay in ms before resolving a connection (prevent server from attempting
  // too many connections at once)
  delay: 300,

  // Connection settings
  nearbyTimeout: 10000, // ms to wait since last signal detected from watch before updating to 'Unknown'
};

export { settings, join };
