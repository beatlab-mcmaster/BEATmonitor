// BEATmonitor -- v0.100
// Load storage module
const storage = require("Storage");

// Get device information
const device = {
  program: "BEATwatch",
  version: "v0.100",
  firmware: process.env.VERSION,
  serial: process.env.SERIAL,
  idMAC: NRF.getAddress(),
  idShortMAC: NRF.getAddress().slice(-5).replace(":", ""),
};

// Change default BT advertisement
NRF.setAdvertising({}, { name: `BEATwatch ${device.idShortMAC}` });

// Default settings
var settings = {
  physicalId: "NA",
  recordHR: true,
  recordAccel: false,
  allowManual: true,
};

// Store status
var status = {
  state: "WAIT",
  hrmCollected: 0,
  accelCollected: 0,
  //Timestamp is set on record
  startTimestamp: undefined,
  batteryLife: E.getBattery(),
  freeStorage: storage.getFree(),
};

function updateStatus() {
  status.batteryLife = E.getBattery();
  status.freeStorage = storage.getFree();
}

function updateSettings() {
  if (storage.readJSON("beatSettings.json")) {
    let fileSettings = storage.readJSON("beatSettings.json");
    for (let setting in fileSettings) {
      if (settings[setting]) {
        settings[setting] = fileSettings[setting];
      }
    }
  }
}

function getFileData() {
  let dt = new Date(Date.now());
  let shortDate = `${dt.toISOString().slice(5, 19)}`;
  let file = {
    File: {
      Name: shortDate + "_" + device.idShortMAC + "_" + settings.physicalId,
    },
    DeviceInfo: device,
    Settings: settings,
  };
  return file;
}

function getMetaData(state) {
  let dt = new Date(Date.now());
  let data = {
    Status: status,
    Record: {
      DateTime: dt.toString(),
      UNIXTimeStamp: dt,
    },
  };
  return data;
}

// ---------------------------- User Interface --------------------------------
let drawTimeout;
const drawTouch = {
  x1: 5,
  y1: 70,
  x2: 170,
  y2: 135,
};

// Draw the watch face
function draw() {
  g.clear();
  g.setColor(0, 0, 0);
  // Write time -- only update every minute
  g.setFontVector(25);
  g.drawString(
    `${Date(Date.now()).toLocalISOString().slice(11, 23)}`,
    drawTouch.x1 + 1,
    drawTouch.y1 - 25,
  );

  g.setFont("12x20");
  // Draw the program version
  g.drawString(
    `${device.program}-${device.version}`,
    drawTouch.x1 - 3,
    drawTouch.y1 - 45,
  );

  g.setFont("12x20");
  // Draw the physical device ID
  g.drawString(
    `ID:\n${settings.physicalId}`,
    drawTouch.x1 + 110,
    drawTouch.y1 + 25,
  );

  // This is the start button area
  g.drawRect(drawTouch.x1, drawTouch.y1, drawTouch.x2, drawTouch.y2);

  // Draw the device 'state'
  g.drawString("> " + status.state, drawTouch.x1 + 5, drawTouch.y1 + 5);

  // Draw the number of samples collected in record
  g.drawString(
    `Samples:\n${status.hrmCollected + status.accelCollected}`,
    drawTouch.x1 + 5,
    drawTouch.y1 + 25,
  );

  // Draw serial number and MAC address
  g.drawString(
    `${device.serial}\n  ${device.idMAC}`,
    drawTouch.x1 - 3,
    drawTouch.y2 + 2,
  );

  Bangle.drawWidgets();
  // queue next draw
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(
    function () {
      drawTimeout = undefined;
      updateStatus();
      draw();
    },
    60000 - (Date.now() % 60000),
  );
}

// Respond to touch events...
Bangle.on("touch", (button, xy) => {
  if (settings.allowManual) {
    if (
      xy.x > drawTouch.x1 &&
      xy.x < drawTouch.x2 &&
      xy.y > drawTouch.y1 &&
      xy.y < drawTouch.y2
    ) {
      startRecord();
    }
  }
});

// Respond to side button press
let nPress = 0;
setWatch(
  function () {
    nPress++;
    if (nPress > 5) {
      // 5 presses required...
      stopRecord();
      stopStreaming();
    } else if (nPress == 1) {
      setTimeout(() => {
        nPress = 0;
      }, 3000); // ...within 3 seconds
    }
  },
  BTN,
  { edge: "rising", debounce: 50, repeat: true },
);

// ---------------------------- Record to watch -------------------------------
// Button controls
function startRecord() {
  if (status.state == "WAIT") {
    status.state = "START_RECORD";
    Bluetooth.println("Starting record");

    // Get current watch info
    fileData = getFileData();
    metaData = getMetaData(status.state);
    status.startTimestamp = metaData.Record.UNIXTimeStamp;
    // Create a file to store heart rate data
    data = storage.open(fileData.File.Name, "a");
    // Start by writing watch info
    data.write(JSON.stringify(fileData) + "\n");
    data.write(JSON.stringify(metaData) + "\n");

    // Turn on the heart rate sensor
    Bangle.setHRMPower(1);
    status.state = "RECORDING";
    setNRF(1);
    draw();
  } else {
    Bluetooth.println("Not ready to start record");
  }
  Bluetooth.println(sendStatus());
}

function stopRecord() {
  if (status.state == "RECORDING") {
    status.state = "STOP_RECORD";
    Bluetooth.println("Stopping record");

    // Write end data
    metaData = getMetaData(status.state);
    data.write(JSON.stringify(metaData));

    // Reset record
    // Turn off the heart rate sensor
    Bangle.setHRMPower(0);
    status.hrmCollected = 0;
    status.accelCollected = 0;
    status.state = "WAIT";
    setNRF(0);
    draw();
  } else {
    Bluetooth.println("No record to stop");
  }
  Bluetooth.println(sendStatus());
}

// ---------------------------- Send data stream ------------------------------
function startStreaming() {
  if (status.state == "WAIT") {
    status.state = "START_STREAM";
    Bluetooth.println("Starting stream");

    // Turn on the heart rate sensor
    Bangle.setHRMPower(1);
    status.state = "STREAMING";
    setNRF(3);
    draw();
  } else {
    Bluetooth.println("Not ready to stream");
  }
}

function stopStreaming() {
  if ((status.state = "STREAMING")) {
    status.state = "STOP_STREAM";
    Bluetooth.println("Stopping stream");

    // Turn off the heart rate sensor
    Bangle.setHRMPower(0);
    status.hrmCollected = 0;
    status.accelCollected = 0;
    status.state = "WAIT";
    setNRF(0);
    draw();
  } else {
    Bluetooth.println("No stream to stop");
  }
}

// ---------------------------- Configure settings ----------------------------
function sendSettings() {
  Bluetooth.println(JSON.stringify(settings));
}

function setSettings(newSettings) {
  if (status.state == "WAIT" && newSettings != undefined) {
    storage.writeJSON("beatSettings.json", newSettings);
    updateSettings();
    Bluetooth.println(JSON.stringify(device));
    Bluetooth.println(sendSettings());
  } else {
    Bluetooth.println("[INFO] Watch is busy, cannot set ID!");
  }
}

// ----------------------- Storage management / transfer ----------------------
function sendStorage() {
  if (status.state == "WAIT") {
    let files = { files: [] };
    let storageFiles = storage.list(/(\d.-\d.T\d.:\d.:\d._...._)/); // TODO: Allow for any watchname
    storageFiles.forEach((e) => {
      let f = storage.open(e.replace("\u0001", ""), "r");
      let l = f.getLength();
      files.files.push({
        name: e,
        size: l,
      });
    });
    Bluetooth.println(JSON.stringify(files) + "[EOF]");
  } else {
    Bluetooth.println("[INFO] Watch is busy, cannot send storage!");
  }
}

function deleteStorage(files) {
  if (status.state == "WAIT") {
    if (files === undefined) {
      Bluetooth.println("[INFO] No files to delete are specified!");
    } else if (files == "all") {
      let storageFiles = storage.list(/(\d.-\d.T\d.:\d.:\d._...._)/);
      storageFiles.forEach((e) => {
        Bluetooth.println(`Deleting: ${e}`);
        storage.open(e.replace("\u0001", ""), "r").erase();
      });
    } else {
      storage.open(files, "r").erase();
      Bluetooth.println(`Deleting ${files}`);
    }
  } else {
    Bluetooth.println("[INFO] Watch is busy, cannot delete file(s)!");
  }
}

function sendData(fileName) {
  if (status.state == "WAIT") {
    status.state = "SENDING";
    setNRF(2);
    ts = Date.now();
    f = require("Storage").open(fileName, "r");
    var len = f.getLength(); // File length (size) in bytes
    Bluetooth.println(`[INFO] Sending file... ${fileName}`);
    var prog = 0; // Keep track of the read/sent bytes

    var sendData = setInterval(() => {
      d = f.readLine(); // Read 1 line
      if (d === undefined) {
        // Reached the end of the file
        td = Date.now();
        d =
          "[INFO] Reached EOF ... Done [" +
          ((td - ts) / 1000).toFixed(2) +
          " s]";
        clearInterval(progress); // stop sending progress
        clearInterval(sendData); // stop sending data
        status.state = "WAIT";
        setNRF(0);
      } else {
        prog += d.length; // update progress
      }
      Bluetooth.println(d); // Send data/message over bluetooth
    }, 1);
    // send 1 line/ms
    var progress = setInterval(() => {
      p = Math.round((prog / len) * 100); // Calculate progress
      Bluetooth.println(
        "[Progress] " + p + "%  [" + prog + " of " + len + "] bytes",
      );
    }, 1000); // Update once per second
  } else {
    Bluetooth.println("[INFO] Watch is busy, cannot send data!");
  }
}

// ---------------------------- Broadcast watch state -------------------------
function setNRF(val) {
  NRF.setAdvertising(
    {},
    {
      manufacturer: 0x0590,
      manufacturerData: JSON.stringify({ s: val }),
    },
  );
}

// ---------------------------- Send status  ----------------------------------
function sendStatus() {
  Bluetooth.println(JSON.stringify(status));
}

// ---------------------------- Time sync / drift -----------------------------
function syncTime(time) {
  setTime(time);
  Bluetooth.println(getTime());
}

function getDrift(serverTime) {
  let watchTime = getTime();
  Bluetooth.println(watchTime);
}

// ---------------------------- Vibration -------------------------------------
function setVibrate(time, strength) {
  Bangle.buzz(time, strength).then(() => {
    print("[INFO] Vibration done");
  });
}

// ---------------------------- Record HR / PPG data --------------------------
// Default interval is 80ms; this replaces the setInterval + period workaround
//  - https://www.espruino.com/Reference#l_Bangle_setPollInterval
//Bangle.setPollInterval(40);

var prevWriteTimestamp = 0;
// This function will be called continuously while setHRMpower is on
function getHR(hrm) {
  let now = Date.now();
  let diff = Math.round(now - prevWriteTimestamp);

  // We want a minimum of 35ms between samples; and filter unlikely heart rates
  if (diff > 35 && hrm.bpm > 30 && hrm.bpm < 240) {
    if (status.state == "RECORDING") {
      // Write diff from start of record to save space
      let ts = Math.round(Date.now() - status.startTimestamp);
      // Create row with unix time and hr data
      let obs = [
        ts,
        Math.round(hrm.bpm * 10), // save decimal, div by 10 later
        hrm.confidence,
        hrm.raw,
        hrm.filt,
      ].join(",");
      // Write to file
      data.write(obs + "\n");
    } else if (status.state == "STREAMING") {
      let dbuf = new ArrayBuffer(19); // n = record size
      let d = new DataView(dbuf);

      d.setFloat64(0, now);

      d.setUint8(8, hrm.bpm); // Heart rate
      d.setUint8(9, hrm.confidence); // Confidence
      d.setInt16(10, hrm.raw); // Raw PPG
      d.setInt16(12, hrm.filt); // Filter PPG

      a = Bangle.getAccel();
      d.setInt8(14, Math.round(a.x * 50));
      d.setInt8(15, Math.round(a.y * 50));
      d.setInt8(16, Math.round(a.z * 50));
      d.setUint8(17, Math.round(a.diff * 100));
      d.setUint8(18, Math.round(a.mag * 100));

      Bluetooth.println(d.buffer);
    }
    status.hrmCollected++;
    prevWriteTimestamp = now;
  }
}

// ---------------------------- Record Acceleration ---------------------------

function procAccel(xyz) {
  if (settings.recordAccel & (status.state == "RECORDING")) {
    let ts = Math.round(Date.now() - status.startTimestamp);
    let obs = [
      ts,
      Math.round(xyz.x * 1000),
      Math.round(xyz.y * 1000),
      Math.round(xyz.z * 1000),
      Math.round(xyz.mag * 1000),
      Math.round(xyz.diff * 1000),
    ].join(",");
    data.write("A" + obs + "\n");
    status.accelCollected++;
  }
}

// ---------------------------- Initial function calls ------------------------
// Get settings from file
updateSettings();

// Listen for HRM values
Bangle.on("HRM-raw", getHR);

// Listen for accelerometer values
Bangle.on("accel", procAccel);

// Call first draw to screen
g.reset();
Bangle.loadWidgets();
setNRF(0);
draw();
