/** server.ts
 * Author: Maya B. Flannery
 * Description: This app manages bluetooth connections to multiple Bangle.js 2
 * smartwatches (using the 'noble' module). User interface is provided through
 * a web browser (web page served by the 'express' module; server[node] to
 * client[browser] communication by 'socket.io' module) */

import express from "express"; // Serve local web pages
import { createServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io"; // Communication between browser and node
import fs from "fs";
import logger from "./logger.js";
import noble from "@abandonware/noble";
import { info, WatchDevice } from "./watchDevice.js";
import { settings, join } from "./config.js";

// Mapping to track watches
const knownWatches = new Map();

// Create web server
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

app.use(express.static(settings.routePublic)); // Route html

app.use("/node_modules", express.static(settings.routeNodeModules));

app.get("/", (req, res) => {
  logger.log("info", `Request from ${req.headers["user-agent"]}`);
  res.sendFile(settings.index); // Send dashboard to browser
});

// Create directories
for (const dir of Object.values(settings.directory)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Check for known watches
fs.readdirSync(settings.directory.watchList).forEach((file) => {
  if (file.endsWith(".json")) {
    logger.log("info", `Reading known watch data: ${file}`);
    let fWatchData = JSON.parse(
      fs.readFileSync(join(settings.directory.watchList, file)).toString(),
    );
    // Add the found watch to known watches with watch constructor
    knownWatches.set(
      fWatchData.deviceId,
      new WatchDevice(undefined, fWatchData),
    );
  }
});

// Read transferred files
let readTransferredFiles = function () {
  let fileInfo: { name: string; size: number }[] = [];
  let extensions: string[] = [".csv", ".hr", ".sv"];
  fs.readdirSync(settings.directory.transferredData).forEach((file) => {
    if (extensions.some((ext) => file.endsWith(ext))) {
      // Get size of file
      let size = fs.statSync(
        join(settings.directory.transferredData, file),
      ).size;
      fileInfo.push({ name: file, size: size });
    }
  });
  return fileInfo;
};
var transferredFiles = readTransferredFiles();

// Start web server
server.listen(settings.port, () => {
  logger.log("info", `Server is running: http://localhost:${settings.port}`);
});

// Power bluetooth
noble.on("stateChange", function (state) {
  logger.log("info", "NOBLE: stateChange -> " + state);
  if (state == "poweredOn") {
    noble.startScanning([], true);
  }
});

// Nearby devices will be detected when scanning is enabled
noble.on("scanStart", () => {
  logger.log("info", `NOBLE: Bluetooth scanning started`);
});

noble.on("scanStop", () => {
  logger.log("info", `NOBLE: Bluetooth scanning stopped`);
});

// Event when a new device is found
noble.on("discover", async function (dev) {
  let nearbyDevice = dev.advertisement.localName;

  if (typeof nearbyDevice == "undefined") return;

  // We are only interested in Bangle.js devices
  if (
    nearbyDevice.startsWith("Bangle.js") ||
    nearbyDevice.startsWith("BEATLab")
  ) {
    if (knownWatches.has(nearbyDevice)) {
      // Update known previously detected watches
      if (!knownWatches.get(nearbyDevice).updated) {
        logger.log("info", `NOBLE: Updating existing watch '${nearbyDevice}'`);
        knownWatches.get(nearbyDevice).setPeripheral(dev);
      } else {
        knownWatches.get(nearbyDevice).setNearby = dev.rssi;
        if (dev.advertisement.manufacturerData) {
          let deviceState = JSON.parse(
            // Set to 1 when watch is recording, 0 when ready
            dev.advertisement.manufacturerData.toString().substring(2),
          );
          // Update the device state
          knownWatches.get(nearbyDevice).setState = deviceState.s;
        }
      }
    } else {
      if (settings.allowNewDevices) {
        // Create a new watch
        logger.log("info", `NOBLE: Found new watch '${nearbyDevice}'`);
        knownWatches.set(nearbyDevice, new WatchDevice(dev));
      }
    }
  }
});

// Handle browser messages (from clients)
io.on("connection", (socket: Socket) => {
  logger.log("info", "Socket connected");

  socket.on("rsa", (msg): void => {
    logger.log("info", `RSA: ${JSON.stringify(msg)}`);
  });

  socket.emit("clearAll", "clear");

  socket.on("info", (msg): void => {
    logger.log("info", `Client Info: ${msg}`);
  });

  socket.on("btn-note", (note): void => {
    logger.log("info", `SERVER NOTE: {"Performance": ${JSON.stringify(note)}}`);
  });

  socket.on("ui-btn", (msg): void => {
    logger.log("info", `Client UI: ${msg}`);
  });

  socket.on("btn-click", (data) => {
    let delay = 0;
    // Handle button presses sent from client
    logger.log(
      "info",
      `SERVER NOTE: {"Command": ${JSON.stringify(data)}}`,
      // `Button click: '${data.cmd}' on device: '${data.device}' [msg: '${data.msg}']`,
    );
    if (data.device == "all") {
      // Send command to all watches
      knownWatches.forEach((e) => {
        setTimeout(() => {
          switch (data.cmd) {
            case "recordStart":
              e.startRecording();
              break;
            case "recordStop":
              e.stopRecording();
              break;
            case "sync":
              e.setTime();
              break;
            case "getDrift":
              e.getDriftEstimate();
              break;
            case "sendSurvey":
              e.sendSurvey();
              break;
            case "sendCommand":
              e.sendEvent(data.msg);
              break;
            case "getStorageList":
              e.getStorageInfo();
              break;
            case "getFiles":
              if (data.msg != undefined) {
                e.getDataFile(data.msg);
                console.log("data:", data.msg);
              } else {
                console.log(`skipping device: ${data.device}`);
              }
              break;
          }
        }, delay);
        delay += 50;
      });
    } else {
      // Send command to single watch
      switch (data.cmd) {
        case "reconnect":
          knownWatches.get(data.device).updated = false;
          logger.log("info", `Reconnecting: ${data.device}`);
          break;
        case "getName":
          knownWatches.get(data.device).getPhysicalId();
          break;
        case "getDrift":
          knownWatches.get(data.device).getDriftEstimate();
          break;
        case "recordStart":
          knownWatches.get(data.device).startRecording();
          break;
        case "recordStop":
          knownWatches.get(data.device).stopRecording();
          break;
        case "streamStart":
          knownWatches.get(data.device).startStreaming();
          break;
        case "streamStop":
          knownWatches.get(data.device).stopStreaming();
          break;
        case "sync":
          knownWatches.get(data.device).setTime();
          break;
        case "getStorageList":
          knownWatches.get(data.device).getStorageInfo();
          break;
        case "sendFiles":
          knownWatches.get(data.device).getDataFile();
          break;
        case "sendSurvey":
          knownWatches.get(data.device).sendSurvey();
          break;
        case "sendCommand":
          knownWatches.get(data.device).sendEvent(data.msg);
          break;
        case "getFiles":
          knownWatches.get(data.device).getDataFile(data.msg);
          break;
        case "verifyFiles":
          transferredFiles = readTransferredFiles();
          let deviceFiles = knownWatches.get(data.device).storage;
          deviceFiles.files.forEach((file) => {
            // Match file name and size
            let match = transferredFiles.find(
              (e) =>
                e.name.replace(/\.sv|\.hr|\.csv/g, "").replace("_time_", "T") ==
                  file.name.replace(/HR|SV/g, "").replaceAll(":", "-") &&
                e.size == file.size,
            );
            if (match) {
              console.log("Matched file: ", match);
            } else {
              console.log("File not matched: ", file);
            }
          });
          break;
      }
    }
  });

  // Forward watch messages to client
  knownWatches.forEach((e) => {
    e.on("watchMessage", (data: info) => {
      console.log("Message from watch --> ", data);
      socket.emit("watch", data);
    });
    e.on("watchInfoAll", (data: info) => {
      socket.emit("watchInfoAll", data);
    });
    e.on("watchInfoSingle", (data: info) => {
      socket.emit("watchInfoSingle", data);
    });
    e.getInfo();
    setTimeout(() => {
      e.getInfo();
    }, 5000);
  });
});

io.engine.on("connection_error", (err) => {
  logger.log("error", err.req); // the request object
  logger.log("error", err.code); // the error code, for example 1
  logger.log("error", err.message); // the error message, for example "Session ID unknown"
  logger.log("error", err.context); // some additional error context
});

// TODO: Resume function -- search for timestamp
// TODO: Timesync when finished recording
