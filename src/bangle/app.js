// BEATmonitor -- v0.05
// Load storage module
const storage = require("Storage");

// Get device information
const infoProgram = "BEATmonitor";
const infoVersion = "v0.05";
const infoSerial = process.env.SERIAL;
const infoMAC = NRF.getAddress();
const shortMAC = infoMAC.slice(-5).replace(":", "");

// Change default BT advertisement
NRF.setAdvertising({}, { name: `BEATLab ${shortMAC}` });

let infoPhysicalID = (function () {
  try {
    return storage.readJSON("physicalID.json").PhysicalID;
  } catch (e) {
    return "ERR!"; // Error if cannot read ID
  }
})();

var state = "WAIT";
var samplesCollected = 0;
var metaData;
var data;
// Timestamp is set on record
var startTimestamp;

let getFileData = function () {
  let dt = new Date(Date.now());
  let shortDate = `${dt.toISOString().slice(5, 19)}`;
  let file = {
    File: {
      Name: shortDate + "_" + shortMAC + "_" + infoPhysicalID,
      Serial: infoSerial,
      MAC: infoMAC,
      PhysicalID: infoPhysicalID,
    },
  };
  return file;
};

let getMetaData = function (state) {
  let dt = new Date(Date.now());
  let data = {
    Record: {
      State: state,
      DateTime: dt.toString(),
      UNIXTimeStamp: dt,
      BatteryLife: E.getBattery(),
      FreeStorage: storage.getFree(),
      SamplesWritten: samplesCollected,
    },
  };
  return data;
};

// ---------------------------- User Interface --------------------------------
let drawTimeout;
const drawTouch = {
  x1: 5,
  y1: 70,
  x2: 170,
  y2: 135,
};

// Draw the watch face
let draw = function () {
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
    `${infoProgram}-${infoVersion}`,
    drawTouch.x1 - 3,
    drawTouch.y1 - 45,
  );

  g.setFont("12x20");
  // Draw the physical device ID
  g.drawString(`ID:\n${infoPhysicalID}`, drawTouch.x1 + 110, drawTouch.y1 + 25);

  // This is the start button area
  g.drawRect(drawTouch.x1, drawTouch.y1, drawTouch.x2, drawTouch.y2);

  // Draw the device 'state'
  g.drawString("> " + state, drawTouch.x1 + 5, drawTouch.y1 + 5);

  // Draw the number of samples collected in record
  g.drawString(
    `Samples:\n${samplesCollected}`,
    drawTouch.x1 + 5,
    drawTouch.y1 + 25,
  );

  // Draw serial number and MAC address
  g.drawString(
    `${infoSerial}\n  ${infoMAC}`,
    drawTouch.x1 - 3,
    drawTouch.y2 + 2,
  );

  Bangle.drawWidgets();
  // queue next draw
  if (drawTimeout) clearTimeout(drawTimeout);
  drawTimeout = setTimeout(
    function () {
      drawTimeout = undefined;
      draw();
    },
    60000 - (Date.now() % 60000),
  );
};

// Respond to touch events...
Bangle.on("touch", (button, xy) => {
  if (
    xy.x > drawTouch.x1 &&
    xy.x < drawTouch.x2 &&
    xy.y > drawTouch.y1 &&
    xy.y < drawTouch.y2
  ) {
    startRecord();
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
let startRecord = function () {
  if (state == "WAIT") {
    state = "START_RECORD";
    console.log("Starting record");

    // Get current watch info
    fileData = getFileData();
    metaData = getMetaData(state);
    startTimestamp = metaData.Record.UNIXTimeStamp;
    // Create a file to store heart rate data
    data = storage.open(fileData.File.Name, "a");
    // Start by writing watch info
    data.write(JSON.stringify(fileData) + "\n");
    data.write(JSON.stringify(metaData) + "\n");

    // Turn on the heart rate sensor
    Bangle.setHRMPower(1);
    state = "RECORDING";
    setNRF(1);
    draw();
  } else {
    console.log("Not ready to start record");
  }
};

let stopRecord = function () {
  if (state == "RECORDING") {
    state = "STOP_RECORD";
    console.log("Stopping record");

    // Write end data
    metaData = getMetaData(state);
    data.write(JSON.stringify(metaData));

    // Reset record
    // Turn off the heart rate sensor
    Bangle.setHRMPower(0);
    samplesCollected = 0;
    state = "WAIT";
    setNRF(0);
    draw();
  } else {
    console.log("No record to stop");
  }
};

// ---------------------------- Send data stream ------------------------------
let startStreaming = function () {
  if (state == "WAIT") {
    state = "START_STREAM";
    console.log("Starting stream");

    // Turn on the heart rate sensor
    Bangle.setHRMPower(1);
    state = "STREAMING";
    setNRF(3);
    draw();
  } else {
    console.log("Not ready to stream");
  }
};

let stopStreaming = function () {
  if ((state = "STREAMING")) {
    state = "STOP_STREAM";
    console.log("Stopping stream");

    // Turn off the heart rate sensor
    Bangle.setHRMPower(0);
    samplesCollected = 0;
    state = "WAIT";
    setNRF(0);
    draw();
  } else {
    console.log("No stream to stop");
  }
};

// ---------------------------- Configure watch id ----------------------------
let sendWatchId = function () {
  if (state == "WAIT") {
    print(`${infoPhysicalID}`);
  } else {
    print("[INFO] Watch is busy, cannot send ID");
  }
};

let setWatchId = function (watchID) {
  if (state == "WAIT" && watchID != undefined) {
    let info = {
      PhysicalID: watchID,
    };
    storage.writeJSON("physicalID.json", info);
    print(`SERIAL: ${process.env.SERIAL}`);
    print(`MAC id: ${NRF.getAddress()}`);
    print(`Watch id set to: ${watchID}`);
    infoPhysicalID = watchID;
  } else {
    print("[INFO] Watch is busy, cannot set ID!");
  }
};

// ----------------------- Storage management / transfer ----------------------
let sendStorage = function () {
  if (state == "WAIT") {
    let storageFiles = storage.list(/(_W...)|(\.csv)/); // TODO: Allow for any watchname
    print(storageFiles.join());
  } else {
    print("[INFO] Watch is busy, cannot send storage!");
  }
};

let deleteStorage = function (files) {
  if (state == "WAIT") {
    if (files === undefined) {
      print("[INFO] No files to delete are specified!");
    } else if (files == "all") {
      let storageFiles = storage.list(/(_W...)|(\.csv)/); // TODO: Allow for any watchname
      storageFiles.forEach((e) => {
        print(`Deleting: ${e}`);
        storage.open(e.replace("\u0001", ""), "r").erase();
      });
    } else {
      storage.open(files, "r").erase();
      print(`Deleting ${files}`);
    }
  } else {
    print("[INFO] Watch is busy, cannot delete file(s)!");
  }
};

let sendData = function (fileName) {
  if (state == "WAIT") {
    state = "SENDING";
    setNRF(2);
    ts = Date.now();
    f = require("Storage").open(fileName, "r");
    var len = f.getLength(); // File length (size) in bytes
    print(`[INFO] Sending file... ${fileName}`);
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
        state = "WAIT";
        setNRF(0);
      } else {
        prog += d.length; // update progress
      }
      print(d); // Send data/message over bluetooth
    }, 1);
    // send 1 line/ms
    var progress = setInterval(() => {
      p = Math.round((prog / len) * 100); // Calculate progress
      print("[Progress] " + p + "%  [" + prog + " of " + len + "] bytes");
    }, 1000); // Update once per second
  } else {
    print("[INFO] Watch is busy, cannot send data!");
  }
};

// ---------------------------- Broadcast watch state -------------------------
let setNRF = function (val) {
  NRF.setAdvertising(
    {},
    {
      manufacturer: 0x0590,
      manufacturerData: JSON.stringify({ s: val }),
    },
  );
};

// ---------------------------- Time sync / drift -----------------------------
let syncTime = function (time) {
  setTime(time);
  Bluetooth.println(getTime());
};

let getDrift = function (serverTime) {
  let watchTime = getTime();
  Bluetooth.println(watchTime);
};

// ---------------------------- Vibration -------------------------------------
let setVibrate = function (time, strength) {
  Bangle.buzz(time, strength).then(() => {
    print("[INFO] Vibration done");
  });
};

// ---------------------------- Record HR / PPG data --------------------------
// Default interval is 80ms; this replaces the setInterval + period workaround
//  - https://www.espruino.com/Reference#l_Bangle_setPollInterval
//Bangle.setPollInterval(40);

var prevWriteTimestamp = 0;
// This function will be called continuously while setHRMpower is on
let getHR = function (hrm) {
  let now = Date.now();
  let diff = Math.round(now - prevWriteTimestamp);

  // We want a minimum of 35ms between samples; and filter unlikely heart rates
  if (diff > 35 && hrm.bpm > 30 && hrm.bpm < 240) {
    if (state == "RECORDING") {
      // Write diff from start of record to save space
      let ts = Math.round(Date.now() - startTimestamp);
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
    } else if (state == "STREAMING") {
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
    samplesCollected++;
    prevWriteTimestamp = now;
  }
};

// ---------------------------- Initial function calls ------------------------
// Listen for HRM values
Bangle.on("HRM-raw", getHR);

// Call first draw to screen
g.reset();
Bangle.loadWidgets();
setNRF(0);
draw();
