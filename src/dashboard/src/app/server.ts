/** server.ts
 * Author: Maya B. Flannery
 * Description: This app manages bluetooth connections to multiple Bangle.js 2
 * smartwatches (using the 'noble' module). User interface is provided through
 * a web browser (web page served by the 'express' module; server[node] to
 * client[browser] communication by 'socket.io' module) */

import express from "express"; // Serve local web pages
import { createServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io"; // Communication between browser and node
import osc from "osc"; // TODO: switch to node-osc (https://www.npmjs.com/package/node-osc)
import fs from "fs";
import { logger, LogLevel } from "./logger.js";
import noble from "@abandonware/noble";
import { WatchDevice } from "./watchDevice.js";
import type * as WatchTypes from "../types/device";
import { settings, join } from "./config.js";

const allowDuplicates = true; // For clarity--must be true for BLE scan responses!
// Mapping to track watches
const knownWatches = new Map();

// Create web server
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server);

// Listen to OSC messages
var nMessageOSC = 0;
const udpPort = new osc.UDPPort({
  localAddress: settings.OSCnetwork,
  localPort: settings.OSCport,
  metadata: true,
});

udpPort.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.log("error", `OSC port ${udpPort.options.localPort} already in use`);
    // decide what to do (see below)
  } else {
    logger.log("error", "OSC error:", err);
  }
});

udpPort.on("ready", () => {
  logger.log("osc", `Listening for OSC over UDP on ${settings.OSCport}`);
});

udpPort.on("message", (oscMsg, timeTag, info) => {
  nMessageOSC += 1;
  function toInt64(v) {
    // Needed to deal with 64-bit python data
    const high = v.high >>> 0;
    const low = v.low >>> 0;
    return high * 2 ** 32 + low;
  }
  const arg = oscMsg.args?.[0];
  let oscInfo = {
    id: nMessageOSC,
    from: info,
    message: oscMsg.address,
    arguments: oscMsg.args,
    msgLength: oscMsg.args.length,
  };
  if (arg && arg.type === "h") {
    // Compare sent time to received time
    const value = toInt64(arg.value);
    const now = Math.floor(Date.now() / 10); // same scale as time.time() * 100
    const diff = now - value;
    oscInfo["receivedTime"] = value;
    oscInfo["timeDiff"] = diff;
  }
  logger.log("osc", `${JSON.stringify(oscInfo)}`);
});

udpPort.open();

app.use(express.static(settings.routePublic)); // Route html

app.use("/node_modules", express.static(settings.routeNodeModules));

app.get("/", (req, res) => {
  logger.info(`Request from ${req.headers["user-agent"]}`);
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
    logger.info(`Reading known watch data: ${file}`);
    let fWatchData = JSON.parse(
      fs.readFileSync(join(settings.directory.watchList, file)).toString(),
    );
    // Add the found watch to known watches with watch constructor
    // console.log(JSON.stringify(fWatchData));
    knownWatches.set(
      fWatchData.device.id,
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
  logger.info(`Server is running: http://localhost:${settings.port}`);
});

// Power bluetooth
noble.on("stateChange", function (state) {
  logger.info("NOBLE: stateChange -> " + state);
  if (state == "poweredOn") {
    noble.startScanning([], allowDuplicates);
  }
});

// Nearby devices will be detected when scanning is enabled
noble.on("scanStart", () => {
  logger.info(`NOBLE: Bluetooth scanning started`);
});

noble.on("scanStop", () => {
  logger.info(`NOBLE: Bluetooth scanning stopped`);
});

// Event when a new device is found
noble.on("discover", async function (dev) {
  // TODO: remember peripheral (it's possible to attempt connecting without 'discovering' a device)
  let nearbyDevice = dev.advertisement.localName;

  if (typeof nearbyDevice == "undefined") return;

  // We are only interested in Bangle.js devices
  if (
    nearbyDevice.startsWith("Bangle.js") ||
    nearbyDevice.startsWith("BEATLab") ||
    nearbyDevice.startsWith("BW") ||
    nearbyDevice.startsWith("BEATwatch")
  ) {
    if (knownWatches.has(nearbyDevice)) {
      // Update known previously detected watches
      if (!knownWatches.get(nearbyDevice).updated) {
        logger.info(`NOBLE: Updating existing watch '${nearbyDevice}'`);
        knownWatches.get(nearbyDevice).setPeripheral(dev);
      } else {
        knownWatches.get(nearbyDevice).setNearby = dev.rssi;
        let rssiInfo = { device: nearbyDevice, rssi: dev.rssi };
        logger.log("rssi", `${JSON.stringify(rssiInfo)}`);
        if (dev.advertisement.manufacturerData) {
          let advertisingBuffer =
            dev.advertisement.manufacturerData.subarray(2);
          knownWatches.get(nearbyDevice).setAdvertising(advertisingBuffer);
        }
      }
    } else {
      if (settings.allowNewDevices) {
        // Create a new watch
        logger.info(`NOBLE: Found new watch '${nearbyDevice}'`);
        knownWatches.set(nearbyDevice, new WatchDevice(dev));
      }
    }
  }
});

// Handle browser messages (from clients)
io.on("connection", (socket: Socket) => {
  logger.info("Socket connected");

  socket.on("rsa", (msg): void => {
    logger.log("rsa", `RSA: ${JSON.stringify(msg)}`);
  });

  socket.emit("clearAll", "clear");

  socket.on("info", (msg): void => {
    logger.info(`Client Info: ${msg}`);
  });

  socket.on("btn-note", (note): void => {
    logger.info(`Resetting firstConnectDelay ${firstConnectDelay}`);
    firstConnectDelay = 0; // TODO: temporary
    logger.info(`SERVER NOTE: {"Trial": ${JSON.stringify(note)}}`);
  });

  socket.on("ui-btn", (msg): void => {
    logger.info(`Client UI: ${msg}`);
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
            case "getName":
              e.getDeviceInfo();
              break;
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
        delay += 300;
      });
    } else {
      // Send command to single watch
      switch (data.cmd) {
        case "reconnect":
          logger.info(`Reconnecting: ${data.device}`);
          knownWatches.get(data.device).reconnect();
          knownWatches.delete(data.device);
          break;
        case "getName":
          knownWatches.get(data.device).getDeviceInfo();
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
          // TODO: Handle undefined 'storage'
          deviceFiles.files.forEach((file) => {
            // Match file name and size
            let match = transferredFiles.find(
              (e) =>
                e.name.replace(/\.sv|\.hr|\.csv/g, "").replace("_time_", "T") ==
                  file.name.replace(/HR|SV/g, "").replaceAll(":", "-") &&
                (e.size == file.size || e.size == file.size - 1),
              // TODO: Above: not sure why, some files are 1 byte smaller than size on watch
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
    e.on("watchMessage", (data: WatchTypes.Info) => {
      console.log("Message from watch --> ", data);
      socket.emit("watch", data);
    });
    e.on("watchInfoAll", (data: WatchTypes.Info) => {
      socket.emit("watchInfoAll", data);
    });
    e.on("watchInfoSingle", (data: WatchTypes.Info) => {
      socket.emit("watchInfoSingle", data);
    });
    e.getInfo();
    setTimeout(() => {
      e.getInfo();
    }, 5000);
  });
});
io.engine.on("connection_error", (err) => {
  logger.error(err.req); // the request object
  logger.error(err.code); // the error code, for example 1
  logger.error(err.message); // the error message, for example "Session ID unknown"
  logger.error(err.context); // some additional error context
});

// TODO: Resume function -- search for timestamp
// TODO: Timesync when finished recording

// Cleanly shutdown server when exiting
const shutdown = () => {
  logger.log("info", "Shutting down...");
  udpPort?.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
