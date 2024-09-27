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
    watchList: join(__dirname, "watchData/watchList/"), // .json files are created when Bangle.js watches are found
    transferredData: join(__dirname, "watchData/transferredData/"), // .csv files are created when data are transferred from watches
  },

  // Server settings
  port: 3001, // Change port if it conflicts with another local process
  routePublic: join(__dirname, "public"),
  routeNodeModules: join(__dirname, "node_modules"),
  index: join(__dirname, "public/dashboard.html"),

  // Time syncronization settings
  syncronizationTrials: 15,
  startOffset: 100, // Estimated delay (ms) from server time to setTime on watch; TODO: why start with 100
  setTrialAverage: 5, // The final offset will be calcualed from the last n trials
  watchDelay: 5, // The estimated delay (ms) for the watch to process setTime and prepare response; TODO: verify with test procedure
};

export { settings, join };
