/** server.js
 * Author: Maya B. Flannery
 * Created: 2024-03-27
 * Description: This app manages bluetooth connections to multiple Bangle.js 2
 * smartwatches (using the 'noble' module). User interface is provided through
 * a web browser (web page served by the 'express' module; server[node] to
 * client[browser] communication by 'socket.io' module) */

import express from "express"; // for serving statis pages
import fs from "fs"; // filesystem interaction
import { parse } from "csv-parse"; // handling csv data
import path from "path";
import noble from "@abandonware/noble"; // bluetooth module
import { WatchDevice } from "./WatchDevice.js";
import logger from "./shared/libs/logger.js";
import * as http from "http";
import * as socketio from "socket.io"; // send/recieve events with browser

const __dirname = import.meta.dirname;
const app = express();
const server = http.Server(app);
const io = new socketio.Server();
io.attach(server);
const port = 3000;

var nobleReady = false;
const knownDeviceList = new Map(); // keep track of devices that are found on BLE

// Load list of devices with Innocents App installed (get watch mapping)
const referenceDevices = new Map();
fs.createReadStream("./watchData.csv")
  .pipe(parse({ delimiter: ",", from_line: 2 }))
  .on("data", function (row) {
    let name = "Bangle.js " + row[1].match(/..:..$/)[0].replace(/:/, "");
    referenceDevices.set(name, row[0]);
  })
  .on("end", function () { })
  .on("error", function (error) {
    console.log(error.message);
  });

// Log when server is running
server.listen(port, () => logging(`SERVER: running on port: ${port}`));

app.use(express.static(path.join(__dirname, "/public")));

// Send dashboard webpage
app.get("/", (req, res) => res.sendFile(__dirname + "/public/dashboard.html"));

// When webpage connects to server, a socket is created
//  Handle incoming messages here
io.on("connection", (socket) => {
  logging(`SOCKET: Dashboard started in browser!`);
  // Event from browser - toggle scanning
  socket.on("toggleDeviceSearch", (data) => {
    logging(`SOCKET: toggle scanning`);
    if (data.toggleDeviceSearch == "on") {
      noble.startScanning([], true);
    } else {
      noble.stopScanning();
    }
  });

  // Handle events from browser
  socket.on("oneReconnect", (data) => {
    logging(`SOCKET: oneReconnect`);
    oneReconnect(data.device);
  });

  socket.on("allStartRecording", (data) => {
    logging(`SOCKET: allStartRecording`);
    allStartRecording();
  });

  socket.on("oneStartRecording", (data) => {
    logging(`SOCKET: oneStartRecording: ${data.oneStartRecording}`);
    oneStartRecording(data.oneStartRecording);
  });

  socket.on("allStopRecording", (data) => {
    logging(`SOCKET: allStopRecording`);
    allStopRecording();
  });

  socket.on("oneStopRecording", (data) => {
    logging(`SOCKET: oneStopRecording: ${data.oneStopRecording}`);
    oneStopRecording(data.oneStopRecording);
  });

  socket.on("allSyncTime", (data) => {
    logging(`SOCKET: allSyncTime`);
    allSyncTime();
  });

  socket.on("allSendCmd", (data) => {
    logging(`SOCKET: allSendCmd '${data.message}'`);
    allSendCmd(data.message);
  });

  socket.on("oneSendCmd", (data) => {
    logging(`SOCKET: oneSendCmd '${data.message}'`);
    oneSendCmd(data.device, data.message);
  });

  socket.on("allGetStorageInfo", (data) => {
    logging(`SOCKET: allGetStorageInfo`);
    allGetStorageInfo();
  });

  socket.on("oneGetStorageInfo", (data) => {
    logging(`SOCKET: oneGetStorageInfo: ${data.oneGetStorageInfo}`);
    oneGetStorageInfo(data.oneGetStorageInfo);
  });

  socket.on("allSetTime", (data) => {
    logging(`SOCKET: allSetTime`);
    allSetTime();
  });

  socket.on("oneSetTime", (data) => {
    logging(`SOCKET: oneSetTime: ${data.device}`);
    oneSetTime(data.device);
  });

  socket.on("allGetData", (data) => {
    logging(`SOCKET: allGetData`);
    allGetData();
  });

  socket.on("oneGetDataFile", (data) => {
    logging(
      `SOCKET: oneGetDataFile: ${data.device}, file: ${data.storageFile}`,
    );
    oneGetDataFile(data.device, data.storageFile);
  });

  socket.on("oneGetDataAll", (data) => {
    logging(`SOCKET: oneGetDataAll: ${data.oneGetStorageInfo}`);
    oneGetDataAll(data.oneGetDataAll);
  });

  socket.emit("referenceDeviceList", referenceDevices);

  // Send device info to browser every 1s
  setInterval(() => {
    if (knownDeviceList.size > 0 && nobleReady) {
      let deviceInfo = [];
      knownDeviceList.forEach((e) => deviceInfo.push(e.getInfo()));
      socket.emit("knownDevices", deviceInfo);
    }
  }, 1000);
});

// Power bluetooth
noble.on("stateChange", function (state) {
  logging("NOBLE: stateChange -> " + state);
});

// Nearby devices will be detected when scanning is enabled
noble.on("scanStart", () => {
  logging(`NOBLE: Bluetooth scanning started`);
  nobleReady = true;
});
noble.on("scanStop", () => {
  logging(`NOBLE: Bluetooth scanning stopped`);
  nobleReady = false;
});

// Event when a new device is found
noble.on("discover", async function (dev) {
  let foundDevice = dev.advertisement.localName;

  if (typeof foundDevice == "undefined") return;

  // We are only interested in Bangle.js devices
  if (foundDevice.startsWith("Bangle.js")) {
    if (knownDeviceList.has(foundDevice)) {
      // Update that device is nearby
      knownDeviceList.get(foundDevice).updateNearby(dev.rssi);
      if (dev.advertisement.manufacturerData) {
        let deviceState = JSON.parse(
          // Set to 1 when watch is recording, 0 when ready
          dev.advertisement.manufacturerData.toString().substr(2),
        );
        // Update the device state
        knownDeviceList.get(foundDevice).updateState(deviceState.s);
      }
    } else {
      // Update that this device is new
      logging(`NOBLE: Found device '${foundDevice}'`);
      knownDeviceList.set(
        foundDevice,
        new WatchDevice(dev, referenceDevices.get(foundDevice)),
      );
    }
  }
});



// Functions (these can be cleaned up)
let oneReconnect = function (device) {
  knownDeviceList.delete(device);
};

let allGetStorageInfo = function () {
  let i = 1;
  knownDeviceList.forEach((e) => {
    setTimeout(() => {
      e.getStorageInfo();
    }, i * 500); // Add a 500ms delay when connecting to many devices
    i++;
  });
};

let allGetData = function () {
  let i = 1;
  knownDeviceList.forEach((e) => {
    setTimeout(() => {
      e.getDataAll();
    }, i * 500); // Add a 500ms delay when connecting to many devices
    i++;
  });
};

let oneGetStorageInfo = function (device) {
  knownDeviceList.get(device).getStorageInfo();
};

// TODO
let oneGetDataFile = function (device, storageFile) {
  knownDeviceList.get(device).getDataFile(storageFile);
};

let oneGetDataAll = function (device) {
  knownDeviceList.get(device).getDataAll();
};

let allStartRecording = function () {
  let i = 1;
  knownDeviceList.forEach((e) => {
    setTimeout(() => {
      e.startRecording();
    }, i * 500); // Add a 500ms delay when connecting to many devices
    i++;
  });
};

let oneStartRecording = function (device) {
  knownDeviceList.get(device).startRecording();
};

let oneStopRecording = function (device) {
  knownDeviceList.get(device).stopRecording();
};

let allStopRecording = function () {
  let i = 1;
  knownDeviceList.forEach((e) => {
    setTimeout(() => {
      e.stopRecording();
    }, i * 500); // Add a 500ms delay when connecting to many devices
    i++;
  });
};

let allSendCmd = function (msg) {
  let i = 1;
  knownDeviceList.forEach((e) => {
    setTimeout(() => {
      e.sendEvent(msg);
    }, i * 1500); // Add a 500ms delay when connecting to many devices
    i++;
  });
};

let oneSendCmd = function (device, msg) {
  knownDeviceList.get(device).sendEvent(msg);
};

let oneSetTime = function (device) {
  knownDeviceList.get(device).setTime();
};

let allSetTime = function () {
  let i = 1;
  knownDeviceList.forEach((e) => {
    setTimeout(() => {
      e.setTime();
    }, i * 500); // Add a 500ms delay when connecting to many devices
    i++;
  });
};

// Logging with timestamp
let logging = function (msg) {
  let t = new Date();
  // console.log(`[${t.toLocaleString()}] > ${msg}`);
  logger.log("info", msg);
};
