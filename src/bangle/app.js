// BEATmonitor -- v0.200
// Load storage module
const storage = require("Storage");

// TODO: Turn accelerometer back off/down, and power save back on so battery drains slower

// --------------------------- Advertisement management -----------------------

// Bit indices
const FLAGS = {
  CHARGING: 0,
  MANUAL_ENABLED: 1,
  ACCEL_ENABLED: 2,
  HR_ENABLED: 3,
  SURVEY_ENABLED: 4,
  STORAGE_CLEARED: 5,
  STORAGE_FULL: 6,
  TRASH_FULL: 7,
};

// Flags (Use only 8 bits)
var flags = 0;

// Possible watch states
const STATE = {
  NOT_READY: 0,
  WAIT: 1,
  START_RECORD: 10,
  RECORDING: 11,
  STOP_RECORD: 12,
  START_STREAM: 20,
  STREAMING: 21,
  STOP_STREAM: 22,
  SENDING_DATA: 100,
  ERROR: 255,
};

// Functions to set/read bits
function writeFlag(mask, bit, value) {
  return value ? mask | (1 << bit) : mask & ~(1 << bit);
}

function readFlag(mask, bit) {
  return (mask & (1 << bit)) !== 0;
}

// ------------------- Update advertisement broadcast -------------------------
function setNRF() {
  flags = writeFlag(flags, FLAGS.CHARGING, Bangle.isCharging());
  checkStorage();
  NRF.setAdvertising(
    {},
    {
      name: `BW${device.idShortMAC}`,
      manufacturer: 0x0590,
      manufacturerData: new Uint8Array([
        flags, // Single bit flags
        status.state, // Current state
        E.getBattery(), // Battery level (0--100)
        255, // For future use
      ]),
    },
  );
}

// --------------------------- Device status ----------------------------------

// Get device information
const device = {
  program: "BEATwatch",
  version: "v0.200",
  firmware: process.env.VERSION,
  serial: process.env.SERIAL,
  idMAC: NRF.getAddress(),
  idShortMAC: NRF.getAddress().slice(-5).replace(":", ""),
  id: `BW${NRF.getAddress().slice(-5).replace(":", "")}`,
};

// Default settings
var settings = {
  physicalId: "NA",
  recordHR: false,
  recordAccel: true,
  allowManual: false,
  maxStorage: 90,
  minStorage: 5,
  maxTrash: 60,
  enableHighSpeed: true,
  highSpeedPollRate: 40,
  showUI: false,
  seatNumber: "X0",
};

// Store status
var status = {
  state: STATE.NOT_READY,
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
  setNRF();
}

function updateSettings() {
  if (storage.readJSON("beatSettings.json")) {
    Bluetooth.println("beatSettings.json found");
    let fileSettings = storage.readJSON("beatSettings.json");
    for (let setting in fileSettings) {
      if (setting in settings) {
        Bluetooth.println(
          `replace existing setting [${setting}] with '${fileSettings[setting]}'`,
        );
        settings[setting] = fileSettings[setting];
      } else {
        Bluetooth.println(`setting: ${setting}`);
      }
    }
  }
  Bluetooth.println(`new settings: ${JSON.stringify(settings)}`);
  status.state = STATE.WAIT;
  flags = writeFlag(flags, FLAGS.ACCEL_ENABLED, settings.recordAccel);
  flags = writeFlag(flags, FLAGS.HR_ENABLED, settings.recordHR);
  flags = writeFlag(flags, FLAGS.MANUAL_ENABLED, settings.allowManual);
  setNRF();
  if (settings.enableHighSpeed) {
    // (KX022-1020: see https://www.espruino.com/datasheets/KX022-1020.pdf)
    Bangle.accelWr(0x1b, 0x03 | 0x40); // 100hz sensor output, ODR/2 filter
    Bangle.setPollInterval(settings.highSpeedPollRate);
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
  if (settings.showUI) {
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
  } else {
    g.setFontVector(35);
    // Draw the physical device ID
    g.drawString(`ID: ${settings.physicalId}`, 10, 50);
    g.setFontVector(30);
    g.drawString(`Seat: ${settings.seatNumber}`, 20, 120);
  }

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
  if (status.state == STATE.WAIT) {
    status.state = STATE.START_RECORD;
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
    status.state = STATE.RECORDING;
    setNRF();
    draw();
  } else {
    Bluetooth.println("Not ready to start record");
  }
  Bluetooth.println(sendStatus());
  setNRF();
}

function stopRecord() {
  if (status.state == STATE.RECORDING) {
    status.state = STATE.STOP_RECORD;
    Bluetooth.println("Stopping record");

    // Write end data
    metaData = getMetaData(status.state);
    data.write(JSON.stringify(metaData));

    // Reset record
    // Turn off the heart rate sensor
    Bangle.setHRMPower(0);
    status.hrmCollected = 0;
    status.accelCollected = 0;
    status.state = STATE.WAIT;
    setNRF();
    draw();
  } else {
    Bluetooth.println("No record to stop");
  }
  Bluetooth.println(sendStatus());
  setNRF();
}

// ---------------------------- Send data stream ------------------------------
function startStreaming() {
  if (status.state == STATE.WAIT) {
    status.state = STATE.START_STREAM;
    Bluetooth.println("Starting stream");

    // Turn on the heart rate sensor
    Bangle.setHRMPower(1);
    status.state = STATE.STREAMING;
    setNRF();
    draw();
  } else {
    Bluetooth.println("Not ready to stream");
  }
  setNRF();
}

function stopStreaming() {
  if ((status.state = STATE.STREAMING)) {
    status.state = STATE.STOP_STREAM;
    Bluetooth.println("Stopping stream");

    // Turn off the heart rate sensor
    Bangle.setHRMPower(0);
    status.hrmCollected = 0;
    status.accelCollected = 0;
    status.state = STATE.WAIT;
    setNRF();
    draw();
  } else {
    Bluetooth.println("No stream to stop");
  }
  setNRF();
}

// ---------------------------- Configure settings ----------------------------
function sendSettings() {
  Bluetooth.println(JSON.stringify(device));
  Bluetooth.println(JSON.stringify(settings));
}

function setSettings(newSettings) {
  if (status.state == STATE.WAIT && newSettings != undefined) {
    if (!newSettings.physicalId) {
      newSettings.physicalId = settings.physicalId;
    }
    storage.writeJSON("beatSettings.json", newSettings);
    updateSettings();
    Bluetooth.println(JSON.stringify(device));
    sendSettings();
  } else {
    Bluetooth.println("[INFO] Watch is busy, cannot set ID!");
  }
}

// ----------------------- Storage management / transfer ----------------------
function checkStorage(print) {
  let currentStorage = storage.getStats();
  let stored = Math.round(
    100 - (currentStorage.freeBytes / currentStorage.totalBytes) * 100,
  );
  let trash = Math.round(
    (currentStorage.trashBytes / currentStorage.totalBytes) * 100,
  );
  flags = writeFlag(flags, FLAGS.STORAGE_FULL, stored > settings.maxStorage);
  flags = writeFlag(flags, FLAGS.TRASH_FULL, trash > settings.maxTrash);
  flags = writeFlag(flags, FLAGS.STORAGE_CLEARED, stored < settings.minStorage);
  if (print) {
    Bluetooth.println(JSON.stringify(currentStorage) + "[EOF]");
  }
}

function sendStorage() {
  if (status.state == STATE.WAIT) {
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
  if (status.state == STATE.WAIT) {
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
  if (status.state == STATE.WAIT) {
    status.state = STATE.SENDING_DATA;
    setNRF();
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
        status.state = STATE.WAIT;
        setNRF();
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
    if (status.state == STATE.RECORDING) {
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
    } else if (status.state == STATE.STREAMING) {
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
  if (settings.recordAccel & (status.state == STATE.RECORDING)) {
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
if (settings.recordHR) Bangle.on("HRM-raw", getHR);

// Listen for accelerometer values
Bangle.on("accel", procAccel);

// Event trigger on/off charger
Bangle.on("charging", (c) => {
  setNRF();
});

// Call first draw to screen
g.reset();
Bangle.loadWidgets();
setNRF();
draw();
