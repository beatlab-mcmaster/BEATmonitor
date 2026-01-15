/** newDevice.ts
 * Author: Maya B. Flannery
 * Note: Use this script with the Espruino web IDE or BEATmonitor dashboard!
 * Description: This script creates a settings file for the BEATwatch application.
 * Ideally, this script will be run on the watch -after- uploading the BEATwatch
 * application using the AppLoader. The `id` for each watch should be unique. */

let id = "W120";
let settings = {
  physicalId: id,
  recordHR: false,
  recordAccel: true,
  allowManual: false,
  maxStorage: 90,
  minStorage: 5,
  maxTrash: 60,
  enableHighSpeed: true,
  highSpeedPollRate: 40,
  seatNumber: "NA",
};
require("Storage").writeJSON("beatSettings.json", settings);
console.log("SERIAL: ", process.env.SERIAL);
console.log("MAC id: ", NRF.getAddress());
console.log(require("Storage").readJSON("beatSettings.json"));
