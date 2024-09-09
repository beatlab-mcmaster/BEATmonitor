/** WatchDevice.js
 * Author: Maya B. Flannery
 * Created: 2024-03-27
 * Description: Watch class definition. When a watch is found on Bluetooth, a 
 * WatchDevice is created. Each device has unique connection information and a
 * set of functions for sending commands and retreiving data from a watch.
*/

import fs from "fs";
import logger from "./shared/libs/logger.js";

class WatchDevice {
  deviceId; // as 'Bangle.js xxxx'
  physicalId; // as 'Wxxx'
  peripheral;
  txCharacteristic;
  rxCharacteristic;
  nearbyTimeout; // clear nearby if device out of range
  nearby = "na";
  connected = false;
  state = "unknown";
  storage = ["na"]; // list of storage files on device
  downloads = []; // Hold stored data (currently not used)
  timeSyncAccuracy = "na - ";
  progressMsg = "";

  constructor(peripheral, id = "na") {
    this.peripheral = peripheral;
    this.deviceId = peripheral.advertisement.localName;
    this.physicalId = id; // id is provided by reference list (csv)
  }

  // return information object
  getInfo() {
    let info = {
      DeviceID: this.deviceId,
      PhysicalID: this.physicalId,
      State: this.state,
      Nearby: this.nearby,
      Connected: this.connected,
      Storage: this.storage,
      TimeSyncAccuracy: this.timeSyncAccuracy,
      Progress: this.progressMsg,
    };
    return info;
  }

  // Set the time on watch: first, estimate the delay offset (time to transmit
  //  timestamp to watch); then average last 5 trials and set time
  setTime() {
    return new Promise((resolve) => {
      // Save what we do for each trial for logging
      let trialData = {
        id: this.physicalId,
        device: this.deviceId,
        trial: [],
        offset: [],
        watchTime: [],
        difference: [],
        roundTrip: [],
      };
      let nTrials = 15;
      let trial = 0;
      let timeStart;
      let offset = 100; // Estimate time to transmit/write time on watch
      this._connect(
        () => {
          // Get server time and send to watch
          timeStart = new Date();
          let cmd = `setTime('${(timeStart.getTime() + offset) / 1000}');print(getTime());`;
          let command = `\x03\x10if(1)${cmd}\n`;
          //this._logging(`Writing '${command}'`);
          this._write(command);
        },
        (data) => {
          if (trial < nTrials) {
            // Recieve watch time; get current time; then compare
            let timeEnd = new Date();
            trialData.trial.push(trial);
            trialData.offset.push(offset);
            let watchTime = new Date(parseFloat(data) * 1000);
            trialData.watchTime.push(watchTime);
            let roundTrip = timeEnd - timeStart;
            // Estimate the moment time is written on watch
            let estimatedWriteTime = (roundTrip - 5) / 2; // Approximately 5ms writing/setting time
            let diff = timeEnd - watchTime - estimatedWriteTime;
            trialData.difference.push(diff);
            // Get the time it took to send->set->recieve
            trialData.roundTrip.push(roundTrip);

            // on the last trial, use the average of last 5 trials
            if (trial == nTrials - 1) {
              // Compute average for the last 5 trials as the final offset
              let avgOffset =
                trialData.offset.slice(-5).reduce((a, c) => a + c, 0) / 5;
              this._logging(avgOffset);
              offset = avgOffset;
            } else {
              // Set new offset to difference between recieved time and actual (end) time
              offset += diff;
            }

            trial++;
            // Try writing time again with new offset
            timeStart = new Date();
            let cmd = `setTime('${(timeStart.getTime() + offset) / 1000}');print(getTime());`;
            let command = `\x03\x10if(1)${cmd}\n`;
            //this._logging(`Writing '${command}'`);
            this._write(command);
          } else if (trial == nTrials) {
            let command = `\x03\x10if(1)draw();print("Done");\n`;
            // save the estimated difference
            this.timeSyncAccuracy = trialData.difference.at(-1);
            this._write(command);
            trial++;
          } else {
            this._disconnect();
            this._logging(JSON.stringify(trialData));
          }
          setTimeout(() => {
            resolve();
          }, 300);
        },
      );
    });
  }

  // The physical id is configured when loading the innocents app to the watch
  //  as 'Wxxx' (stored as a json file on the watch)
  getPhysicalID() {
    return new Promise((resolve) => {
      this._connect(
        () => {
          // 'sendWatchId' is a part of innocents app, returns the watch id
          let cmd = `sendWatchId();`;
          let command = `\x03\x10if(1)${cmd}\n`;
          this._logging(`Writing '${command}'`);
          this._write(command);
        },
        (data) => {
          // Store as physicalId
          this.physicalId = data.match(/W.../);
          this._logging(`got id: ${this.physicalId}`);
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, 300);
        },
      );
    });
  }

  // Retrieve a list of all storage files on the watch
  getStorageInfo() {
    let cmd = `sendStorage();`;
    return new Promise((resolve) => {
      this._connect(
        () => {
          let command = `\x03\x10if(1)${cmd}\n`;
          //this._logging(`Writing '${command}'`);
          this._write(command);
        },
        (data) => {
          this.storage = data.replace(/(\x01)|(\r\n)>/g, "").split(",");
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, 300);
        },
      );
    });
  }

  // Initiate 'sendData()' on watch. The watch opens specified storage file
  //  and sends data line by line for processing
  getDataFile(fileName) {
    let cmd = `sendData('${fileName}');`;
    let dataBuffer = ""; // data are sent in packets, required for parsing
    let recievedFile = []; // store clean lines of data
    let receivedFileName = Date.now().toString(); // Default filename
    return new Promise((resolve) => {
      this._connect(
        () => {
          let command = `\x03\x10if(1)${cmd}\n`;
          this._logging(`Writing '${command}'`);
          this._write(command);
        },
        (data) => {
          dataBuffer += data; // add packet to buffer
          let line = "";
          line = dataBuffer.split("\r\n"); // this is a full line
          dataBuffer = line.pop(); // buffer now equals part of next line
          line.forEach((e) => {
            let ln = e.replace(/\r|>|/g, ""); // remove weird carriage returns
            ln = ln.replace(/^\x1b?\[J/, ""); // and characters
            if (ln.length != 0) {
              if (ln.includes("[INFO] Sending file")) {
                this.progressMsg = ln; // display progress
              } else if (ln.includes("[Progress]")) {
                this.progressMsg = ln;
              } else if (ln.includes(`{"File":`)) {
                // Parse the filename
                if (ln.includes("_W")) {
                  // new naming convention
                  receivedFileName =
                    "2024-" +
                    ln
                      .match(/\"Name\":\"(..-..T..:..:.._...._W...)/)[1]
                      .replace(/:/g, "-")
                      .replace("T", "_time_") +
                    ".csv";
                } else if (ln.includes(".csv")) {
                  // old naming convention
                  receivedFileName =
                    "2024-" +
                    ln
                      .match(/\"Name\":\"(..-..T..:..:.._....\.csv)/)[1]
                      .replace(/:/g, "-")
                      .replace("T", "_time_");
                }
                recievedFile.push(ln); // add json line to file (line 1)
              } else if (ln.includes("START_RECORD")) {
                recievedFile.push(ln); // add json line to file (line 2)
              } else if (ln.includes("STOP_RECORD")) {
                recievedFile.push(ln); // add json line to file (last line)
              } else if (ln.includes("[INFO] Reached EOF")) {
                // When watch reaches end of storage file
                this.progressMsg = ln;
                this.downloads.push(recievedFile);
                try {
                  // write file to computer
                  fs.writeFile(
                    receivedFileName,
                    recievedFile.join("\n"),
                    (err) => {
                      if (err) {
                        console.log(`write> ${err}`);
                      } else {
                      }
                    },
                  );
                } catch (err) {
                  console.log(`try> ${err}`);
                }
                this._disconnect();
              } else {
                recievedFile.push(ln); // these are data lines
              }
            }
          });
          setTimeout(() => {
            resolve();
          }, 300);
        },
      );
    });
  }

  // If device is in range, set nearby for 10s
  updateNearby(rssi = "na") {
    this.nearby = rssi;
    clearTimeout(this.nearbyTimeout);
    this.nearbyTimeout = setTimeout(() => {
      this.nearby = "na";
      this.updateState(10);
    }, 10000);
  }

  // state is set in watch's advertisement id
  updateState(state = 0) {
    switch (state) {
      case 0:
        this.state = "Waiting";
        break;
      case 1:
        this.state = "Recording";
        break;
      case 2:
        this.state = "Sending"; // does not work (no debug yet)
      default:
        this.state = "Unknown";
    }
  }

  // Call 'startRecord()' on watch
  startRecording() {
    return new Promise((resolve) => {
      this._connect(
        () => {
          let command = "\x03\x10startRecord();\n";
          //this._logging(`Writing '${command}'`);
          this._write(command);
        },
        (data) => {
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, 300);
        },
      );
    });
  }

  // Call 'stopRecord()' on watch
  stopRecording() {
    return new Promise((resolve) => {
      this._connect(
        () => {
          let command = "\x03\x10stopRecord();\n";
          //this._logging(`Writing '${command}'`);
          this._write(command);
        },
        (data) => {
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, 300);
        },
      );
    });
  }

  // Manually send an event to watch
  // ** 'deleteStorage("all");' ** to delete all storage files
  //    'deleteStorage("fileName");' to delete specified file
  sendEvent(msg) {
    return new Promise((resolve) => {
      let connectionTimeout;
      this._connect(
        () => {
          //let command = `\x03\x10logEvent(${msg});\n`;
          let command = `\x03\x10${msg}\n`;
          this._logging(`Writing '${command}'`);
          this._write(command);
        },
        (data) => {
          this._logging(data);
          clearTimeout(connectionTimeout); // No end of list is sent by watch, so just timeout
          connectionTimeout = setTimeout(() => {
            this._disconnect();
          }, 1000);
          setTimeout(() => {
            resolve();
          }, 300);
        },
      );
    });
  }

  // Connect function -- slightly modified (added logging and some error
  // handling) from:
  //    https://www.espruino.com/Auto+Data+Download
  // and
  //    https://www.espruino.com/Interfacing#node-js-javascript

  _connect(openCallback, dataCallback) {
    this._logging(`Connecting...`);
    this.connected = true;
    try {
      this.peripheral.connect((error) => {
        if (error) {
          this._logging("ERROR Connecting", error);
          this.peripheral = undefined;
          this.connected = false;
          return;
        }
        this.peripheral.discoverAllServicesAndCharacteristics(
          (error, services, characteristics) => {
            function findByUUID(list, uuid) {
              for (var i = 0; i < list.length; i++)
                if (list[i].uuid == uuid) return list[i];
              return undefined;
            }

            var btUARTService = findByUUID(
              services,
              "6e400001b5a3f393e0a9e50e24dcca9e",
            );
            this.txCharacteristic = findByUUID(
              characteristics,
              "6e400002b5a3f393e0a9e50e24dcca9e",
            );
            this.rxCharacteristic = findByUUID(
              characteristics,
              "6e400003b5a3f393e0a9e50e24dcca9e",
            );
            if (
              error ||
              !btUARTService ||
              !this.txCharacteristic ||
              !this.rxCharacteristic
            ) {
              this._logging("ERROR getting services/characteristics");
              this._logging("Service " + btUARTService);
              this._logging("TX " + this.txCharacteristic);
              this._logging("RX " + this.rxCharacteristic);
              this.peripheral.disconnect();
              this.txCharacteristic = undefined;
              this.rxCharacteristic = undefined;
              this.peripheral = undefined;
              return;
            }
            this.rxCharacteristic.on("data", (data) => {
              var s = "";
              for (var i = 0; i < data.length; i++)
                s += String.fromCharCode(data[i]);
              //this._logging("rxC > " + s);
              dataCallback(s);
            });
            this.rxCharacteristic.subscribe();
            openCallback();
          },
        );
      });
    } catch (err) {
      this._logging(err);
    }
  }

  _write(data) {
    if (!this.peripheral) throw new Error("Not connected");
    let writeAgain = () => {
      if (!data.length) return;
      var d = data.substr(0, 20);
      data = data.substr(20);
      var buf = Buffer.alloc(d.length);
      for (var i = 0; i < buf.length; i++) buf.writeUInt8(d.charCodeAt(i), i);
      this.txCharacteristic.write(buf, false, writeAgain);
    };
    writeAgain();
  }

  _disconnect() {
    this._logging("Disconnecting");
    try {
      this.peripheral.disconnect();
    } catch (err) {
      this._logging(err);
    }
    this.connected = false;
  }

  // Timestamp logs
  _logging(msg) {
    let t = new Date();
    // console.log(`[${t.toLocaleString()}] > DEVICE: '${this.deviceId}' ${msg}`);
    logger.log("info", `DEVICE: '${this.deviceId}' ${msg}`);
  }
}

export { WatchDevice };
