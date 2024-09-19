import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = join(dirname(fileURLToPath(import.meta.url)), "../");

const settings = {
  // Directory settings
  dWatchList: join(__dirname, "watchData/watchList/"),
  dTransferredData: join(__dirname, "watchData/transferredData/"),

  // Server settings
  port: 3001,
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
