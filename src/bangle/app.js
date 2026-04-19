// BEATmonitor -- v0.200
// Load storage module
const storage = require("Storage");

// TODO: Turn accelerometer back off/down, and power save back on so battery drains slower

// ------------------------------ Emulation Only ------------------------------

if (process.env.BOARD == "EMSCRIPTEN2") {
  class EmuBluetooth {
    constructor() {
      console.log("No BLE module, creating wrapper");
    }
    println(msg) {
      console.log(msg);
    }
  }
  globalThis.Bluetooth = new EmuBluetooth();
}

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
  BUZZING: 30,
  SURVEY_ACTIVE: 40,
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
  recordHR: true,
  recordAccel: true,
  allowManual: false,
  maxStorage: 90,
  minStorage: 5,
  maxTrash: 60,
  enableHighSpeed: true,
  enableSurvey: false,
  highSpeedPollRate: 40,
  showUI: false,
  seatNumber: "X0",
};

// Store status
var status = {
  state: STATE.NOT_READY,
  ui: STATE.WAIT,
  hrmCollected: 0,
  accelCollected: 0,
  //Timestamp is set on record
  startTimestamp: undefined,
  batteryLife: E.getBattery(),
  freeStorage: storage.getFree(),
};

// --------------------------- Data storage -----------------------------------

var dataSensor; // HR, Accel data
var dataSurvey; // Survey responses
var survey; // Survey definition
var currentQuestion; // Current question data

function updateStatus() {
  status.batteryLife = E.getBattery();
  status.freeStorage = storage.getFree();
  setNRF();
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
    if (status.state == STATE.RECORDING) {
      g.setColor(1, 0, 0);
      g.fillRect(7, 45, 171, 126);
    } else if (status.state == STATE.SENDING_DATA) {
      g.setColor(1, 1, 0);
      g.fillRect(7, 45, 171, 126);
    }
    g.setColor(0, 0, 0);
    g.drawRect(6, 44, 172, 127);
    g.drawString(`ID: ${settings.physicalId}`, 10, 50);
    g.setFontVector(30);
    g.drawString(`Seat: ${settings.seatNumber}`, 15, 90);
    g.setFontVector(20);
    let uiHR = "--";
    let uiAC = "--";
    let uiSR = "--";
    if (settings.recordHR) {
      uiHR = "HR";
    }
    if (settings.recordAccel) {
      uiAC = "AC";
      if (settings.enableHighSpeed) {
        uiSR = settings.highSpeedPollRate;
      }
    }
    g.drawString(`${device.idShortMAC}|${uiHR}|${uiAC}|${uiSR}`, 10, 157);
  }

  Bangle.drawWidgets();
  // queue next draw
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(
    function () {
      drawTimeout = undefined;
      if (status.ui != STATE.SURVEY_ACTIVE) {
        updateStatus();
        draw();
      }
    },
    60000 - (Date.now() % 60000),
  );
}

// ---------------------------- Record to watch -------------------------------
// Button controls
function startRecord() {
  if (status.state == STATE.WAIT) {
    status.state = STATE.START_RECORD;
    Bluetooth.println("Starting record");

    // Get current watch info
    fileData = getFileData();
    metaData = getMetaData(status.state);
    Bluetooth.println(JSON.stringify(metaData));
    status.startTimestamp = metaData.Record.UNIXTimeStamp;
    // Create a file to store heart rate data
    dataSensor = storage.open(fileData.File.Name, "a");
    // Start by writing watch info
    dataSensor.write(JSON.stringify(fileData) + "\n");
    dataSensor.write(JSON.stringify(metaData) + "\n");

    // Turn on the heart rate sensor
    Bangle.setHRMPower(1);
    status.state = STATE.RECORDING;
    setNRF();
    draw();
  } else {
    Bluetooth.println("Not ready to start record");
  }
  setNRF();
}

function stopRecord() {
  if (status.state == STATE.RECORDING) {
    status.state = STATE.STOP_RECORD;
    Bluetooth.println("Stopping record");
    // Write end data
    metaData = getMetaData(status.state);
    dataSensor.write(JSON.stringify(metaData));
    // Reset record
    // Turn off the heart rate sensor
    Bangle.setHRMPower(0);
    Bluetooth.println(JSON.stringify(metaData));
    status.hrmCollected = 0;
    status.accelCollected = 0;
    status.state = STATE.WAIT;
    setNRF();
    draw();
  } else {
    Bluetooth.println("No record to stop");
  }
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
  // FIX: This sporadically causes error on BEATwatch (when recording?):
  // 'Uncaught Error: Can't write in this mode at beatmonitor.app.js:25:1'
  Bluetooth.println(JSON.stringify(device));
  Bluetooth.println(JSON.stringify(settings));
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
  if (settings.enableSurvey) {
    // Try to read survey
    if (storage.readJSON("beatSurvey.json")) {
      survey = storage.readJSON("beatSurvey.json");
    } else {
      Bluetooth.println("Could not find survey");
    }
  }
  draw();
}

function setSettings(newSettings) {
  if (status.state == STATE.WAIT && newSettings != undefined) {
    for (oldSetting in settings) {
      if (!(oldSetting in newSettings)) {
        newSettings[oldSetting] = settings[oldSetting];
      }
    }
    storage.writeJSON("beatSettings.json", newSettings);
    updateSettings();
    sendSettings();
  } else {
    Bluetooth.println("[INFO] Watch is busy, cannot configure settings!");
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
        draw();
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
  draw();
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
      dataSensor.write(obs + "\n");
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
    dataSensor.write("A" + obs + "\n");
    status.accelCollected++;
  }
}

// -------------------------------- Survey functions --------------------------
function initSection(sectionNumber) {
  console.log(`Initialize section: ${sectionNumber}`);
  buzz().then(() => {
    let d = new Date();
    console.log(`${d.toISOString()} -- Done`); // TODO: remove
    if (sectionNumber > 0) {
      updateSectionStatus(sectionNumber);
    } else {
      drawHome();
    }
  });
}

function updateSectionStatus(sectionNumber) {
  console.log("updating section status");
  if (survey) {
    console.log("Survey exists");
    if (
      (sectionNumber == 0) |
      !status.surveySectionNumber |
      (sectionNumber != status.surveySectionNumber)
    ) {
      status.ui = STATE.WAIT; // FIX: stops recording!!! need a separate survey status!!
      status.surveySectionNumber = 0;
      status.surveySectionName = "na";
      status.surveySectionItems = 0;
      status.surveyItemNumber = 0;
    }
    if (sectionNumber > 0) {
      const section = survey[sectionNumber];
      status.surveySectionNumber = sectionNumber;
      status.surveySectionName = section["name"];
      status.surveySectionItems = section["questions"].length;
      status.surveyItemNumber++;
      if (status.surveyItemNumber > status.surveySectionItems) {
        console.log("Section complete");
        updateSectionStatus(0);
      } else {
        const item = getSectionItem(
          status.surveySectionNumber,
          status.surveySectionName,
          status.surveyItemNumber,
        );
        drawItem(item);
      }
    } else {
      drawHome();
    }
  }
}

function getSectionItem(sectionNumber, sectionName, itemNumber) {
  console.log(
    `getting Section: ${sectionNumber}, Name: ${sectionName} Item: ${itemNumber}`,
  );
  const item = survey[sectionNumber]["questions"][itemNumber - 1];
  return item;
}

function drawItem(item) {
  status.ui = STATE.SURVEY_ACTIVE;
  console.log("Draw item");
  console.log(JSON.stringify(item));

  // Create data for the current question
  currentQuestion = {
    timeStamp: Date.now(),
    number: status.surveySectionNumber,
    name: status.surveySectionName,
    item: status.surveyItemNumber,
    question: item["prompt"].replaceAll("\n", " "),
    input: item["type"],
    range: item["range"],
    response: "NA",
  };

  Bangle.setOptions({ backlightTimeout: 60000, lockTimeout: 60000 });
  Bangle.setBacklight(1);
  Bangle.setLocked(false);
  g.clear();
  widgetsHide();
  // Draw the question text
  g.setFontAlign(0, 0); // Anchor at center of text (vert & hor)
  g.setColor(0, 0, 0); // Set font color to black
  g.setFont("Vector", 27);
  g.drawString(item["prompt"], g.getWidth() / 2, 30);

  // Draw the input feedback
  if (item["type"] == "slider") {
    drawSlider((setPoint = 1), (sliderRange = item["range"]));
  } else if (item["type"] == "number") {
    drawSlider(
      (setPoint = 0),
      (sliderRange = item["range"]),
      (numberInput = true),
    );
  } else {
    console.log("Not a valid input!");
  }
  drawControls();
}

function drawHome() {
  console.log("Draw home");
  status.ui == STATE.WAIT;
  widgetsHide();
  draw();
}

// Vibrate and light up watch n number of times
//   Parameters: the number of times to 'buzz' the participant
function buzz(nTimes) {
  console.log("Buzz called");
  nTimes = nTimes || 7;
  let count = 0;
  return new Promise((resolve) => {
    function doBuzz() {
      count++;
      let d = new Date();
      console.log(`${d.toISOString()} -- Buzz ${count}`); // TODO: remove
      Bangle.buzz(150);
      Bangle.setBacklight(1);
      if (count < nTimes) {
        setTimeout(doBuzz, 300);
      } else {
        setTimeout(resolve, 300);
      }
    }
    doBuzz();
  });
}

// Write participant responses to watch; reset current question to null
function saveResponse() {
  Bluetooth.println("[INFO] Saving: ", currentQuestion);
  let fileData = getFileData();
  let metaData = getMetaData(status.state);
  if (!dataSurvey) {
    dataSurvey = storage.open("SV" + fileData.File.Name, "a");
    // Start by writing watch info
    dataSurvey.write(JSON.stringify(fileData) + "\n");
    dataSurvey.write(JSON.stringify(metaData) + "\n");
  }
  dataSurvey.write(JSON.stringify(currentQuestion) + "\n");
  // Reset
  currentQuestion = null;
}

// ---------------------------- Survey UI -------------------------------------
// define touchscreen buttons
const boxSize = 75;
const boxDown = {
  x1: 5,
  y1: g.getHeight() - boxSize - 5,
  x2: 5 + boxSize,
  y2: g.getHeight() - 5,
};

const boxUp = {
  x1: g.getWidth() - boxSize - 5,
  y1: g.getHeight() - boxSize - 5,
  x2: g.getWidth() - 5,
  y2: g.getHeight() - 5,
};

function drawControls() {
  g.setFontAlign(0, 0); // Anchor at center of text (vert & hor)
  g.setColor(0, 0, 0); // Set font color to black
  g.setFont("Vector", 40);
  g.drawRect(boxDown.x1, boxDown.y1, boxDown.x2, boxDown.y2);
  g.drawString(
    `-`,
    (boxDown.x1 + boxDown.x2 + 5) / 2,
    (boxDown.y1 + boxDown.y2 + 5) / 2,
  );
  g.drawRect(boxUp.x1, boxUp.y1, boxUp.x2, boxUp.y2);
  g.drawString(
    `+`,
    (boxUp.x1 + boxUp.x2 + 5) / 2,
    (boxUp.y1 + boxUp.y2 + 5) / 2,
  );
}

// Draw a 'slider' bar to provide visual feedback of participants' current
//   response.
function drawSlider(setPoint, sliderRange, numberInput) {
  setPoint = setPoint || 0; // Default position of slider
  sliderRange = sliderRange || [0, 6];
  numberInput = numberInput || false;

  var boxOutline;
  var bar;

  if (!numberInput) {
    // Full slider outline
    boxOutline = {
      x1: 5,
      y1: 60,
      x2: g.getWidth() - 5,
      y2: 85,
    };

    // The 'bar' changes length with user input
    bar = {
      x1: boxOutline.x1 + 1,
      y1: boxOutline.y1 + 1,
      x2: boxOutline.x1 + 1,
      y2: boxOutline.y2 - 1,
    };

    // The bar fills by equal discrete 'steps'
    let step =
      (boxOutline.x2 - boxOutline.x1 - 2) / (sliderRange[1] - sliderRange[0]);
    bar.x2 = bar.x1 + setPoint * step;
  } else if (numberInput) {
    boxOutline = {
      x1: g.getWidth() / 2 - 35,
      y1: 40,
      x2: g.getWidth() / 2 + 35,
      y2: 90,
    };
  }

  // Clear draw area
  g.clearRect(boxOutline.x1, boxOutline.y1, boxOutline.x2, boxOutline.y2);

  if (!numberInput) {
    // Draw slider bar
    g.setColor(0, 1, 0); // Green
    g.fillRect(bar.x1, bar.y1, bar.x2, bar.y2);
    if (currentQuestion.response == "NA") {
      g.setFontAlign(0, 0); // Anchor at center of text (vert & hor)
      g.setFont("Vector", 20);
      g.setColor(0, 0, 0); // Black
      g.drawString(
        "Enter response",
        (boxOutline.x2 + boxOutline.x1 + 5) / 2,
        (boxOutline.y2 + boxOutline.y1 + 5) / 2,
      );
    }
  } else if (numberInput) {
    g.setFontAlign(0, 0); // Anchor at center of text (vert & hor)
    g.setFont("Vector", 40);
    g.drawString(
      setPoint,
      (boxOutline.x2 + boxOutline.x1 + 5) / 2,
      (boxOutline.y2 + boxOutline.y1 + 5) / 2,
    );
  }

  // Draw outline
  g.setColor(0, 0, 0); // Black
  g.drawRect(boxOutline.x1, boxOutline.y1, boxOutline.x2, boxOutline.y2);
}

// ---------------------------- Utils -----------------------------------------
// Code modified from: https://github.com/espruino/BangleApps/blob/master/modules/widget_utils.js
function widgetsHide() {
  if (!global.WIDGETS) return;
  g.reset(); // reset colors
  for (var w of global.WIDGETS) {
    if (w._draw) return; // already hidden
    w._draw = w.draw;
    w.draw = () => {};
    w._area = w.area;
    w.area = "";
    if (w.x != undefined) g.clearRect(w.x, w.y, w.x + w.width - 1, w.y + 23);
  }
}

/// Show any hidden widgets
function widgetsShow() {
  if (!global.WIDGETS) return;
  for (var w of global.WIDGETS) {
    if (!w._draw) return; // not hidden
    w.draw = w._draw;
    w.area = w._area;
    delete w._draw;
    delete w._area;
    w.draw(w);
  }
}

// Respond to touch events...
Bangle.on("touch", (button, xy) => {
  if (status.ui == STATE.SURVEY_ACTIVE) {
    if (
      xy.x > boxUp.x1 &&
      xy.x < boxUp.x2 &&
      xy.y > boxUp.y1 &&
      xy.y < boxUp.y2
    ) {
      // console.log("INC");
      setResponse("INC");
    } else if (
      xy.x > boxDown.x1 &&
      xy.x < boxDown.x2 &&
      xy.y > boxDown.y1 &&
      xy.y < boxDown.y2
    ) {
      // console.log("DEC");
      setResponse("DEC");
    }
  } else if (status.ui == STATE.WAIT) {
    if (settings.allowManual) {
      if (
        xy.x > drawTouch.x1 &&
        xy.x < drawTouch.x2 &&
        xy.y > drawTouch.y1 &&
        xy.y < drawTouch.y2
      ) {
        startRecord();
      }
    } else if (status.ui == STATE.RECORDING) {
    }
  }
});

setWatch(
  function () {
    if (status.ui == STATE.SURVEY_ACTIVE) {
      saveResponse();
      updateSectionStatus(status.surveySectionNumber);
    }
  },
  BTN,
  { edge: "rising", debounce: 50, repeat: true },
);

// TODO: combine this code...
// setWatch(
//   function () {
//     nPress++;
//     if (nPress > 5) {
//       // 5 presses required...
//       stopRecord();
//       stopStreaming();
//     } else if (nPress == 1) {
//       setTimeout(() => {
//         nPress = 0;
//       }, 3000); // ...within 3 seconds
//     }
//   },
//   BTN,
//   { edge: "rising", debounce: 50, repeat: true },
// );

// Respond to side button press
let nPress = 0;

function setResponse(direction) {
  console.log(direction, currentQuestion.response, currentQuestion.range);
  if (currentQuestion.response == "NA") {
    currentQuestion.response = currentQuestion.range[0];
  }
  if (
    direction == "INC" &&
    currentQuestion.response < currentQuestion.range[1]
  ) {
    currentQuestion.response += 1;
  } else if (
    direction == "DEC" &&
    currentQuestion.response > currentQuestion.range[0]
  ) {
    currentQuestion.response -= 1;
  }
  if (currentQuestion.input == "slider") {
    drawSlider(currentQuestion.response, currentQuestion.range);
  } else if (currentQuestion.input == "number") {
    drawSlider(currentQuestion.response, currentQuestion.range, true);
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
