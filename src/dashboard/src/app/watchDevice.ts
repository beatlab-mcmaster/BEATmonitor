/** watchDevice.ts
 * Author: Maya B. Flannery
 * Description: */

import fs from "fs";
import logger from "./logger.js";
import { settings } from "./config.js";
import EventEmitter from "node:events";
import type { Peripheral } from "@abandonware/noble";

export type info = { [key: string]: any };

/**
 * The WatchDevice class tracks all relevant watch settings and contains functions
 * to send and receive data from a watch
 * */
class WatchDevice extends EventEmitter {
  peripheralUpdated: boolean = false;
  deviceId: string; // as 'Bangle.js xxxx'
  watchName: string; // as 'Wxxx'
  MACid: string;
  serialNumber: string;
  peripheral: undefined | Peripheral;
  txCharacteristic: any;
  rxCharacteristic: any;
  nearbyTimeout: ReturnType<typeof setTimeout>; // clear nearby if device out of range
  driftTimeout: ReturnType<typeof setInterval>; // calculate drift at set interval
  nearby: number | string = "na";
  connected = false;
  state: string = "Unknown";
  storage: string[] = ["na"]; // list of storage files on device
  // downloads = []; // Hold stored data (currently not used)
  avgOffset: string | number = "Not set";
  timeSyncAccuracy: string | number = "Not synced!";
  progressMsg: string = "";

  constructor(
    peripheral: undefined | Peripheral = undefined,
    {
      deviceId = "Unknown",
      watchName = "Unknown",
      MACid = "Unknown",
      serialNumber = "Unknown",
    } = {},
  ) {
    super();
    if (peripheral == undefined) {
      this.deviceId = deviceId;
      this.watchName = watchName;
      this.MACid = MACid;
      this.serialNumber = serialNumber;
    } else {
      this.setPeripheral(peripheral);
    }
    setTimeout(() => {
      this.emit("watchMessage", `Watch created: ${this.deviceId}`);
    }, 2500);
  }

  get updated() {
    return this.peripheralUpdated;
  }

  set updated(updated) {
    this.peripheralUpdated = updated;
  }

  async setPeripheral(peripheral: Peripheral) {
    this.peripheral = peripheral;
    this.deviceId = peripheral.advertisement.localName;
    this.peripheralUpdated = true;
    await this.getPhysicalId();
    this.writeWatchDataFile();
  }

  writeWatchDataFile() {
    let data = {
      deviceId: this.deviceId,
      watchName: this.watchName,
      MACid: this.MACid,
      serialNumber: this.serialNumber,
    };
    fs.writeFile(
      settings.directory.watchList + this.deviceId + ".json",
      JSON.stringify(data),
      (err) => {
        if (err) {
          console.error(err);
        } else {
          // file written successfully
        }
      },
    );
  }

  // return information object
  getInfo() {
    let info = {
      DeviceID: this.deviceId,
      watchName: this.watchName,
      State: this.state,
      Nearby: this.nearby,
      Connected: this.connected,
      Storage: this.storage,
      TimeSyncAccuracy: this.timeSyncAccuracy,
      Progress: this.progressMsg,
    };
    this.emit("watchInfoAll", info);
  }

  // return a single parameter
  getInfoSingle(component: string) {
    let value: number | boolean | string | string[] = "";
    switch (component) {
      case "storage":
        value = this.storage;
        break;
      case "progress":
        value = this.progressMsg;
        break;
      case "watchName":
        value = this.watchName;
        break;
      case "nearby":
        value = this.nearby;
        break;
      case "state":
        value = this.state;
        break;
      case "connected":
        value = this.connected;
        break;
      case "timeSync":
        value = `${this.timeSyncAccuracy.toString()} ms`;
        break;
      default:
        value = "Unknown";
    }
    let info: info = {
      DeviceID: this.deviceId,
      component: component,
      value: value,
    };
    this.emit("watchInfoSingle", info);
  }

  // Set the time on watch: first, estimate the delay offset (time to transmit
  //  timestamp to watch); then average last 5 trials and set time
  setTime() {
    return new Promise<void>((resolve) => {
      // Save what we do for each trial for logging
      let trialData: {
        id: string;
        device: string;
        trial: number[];
        offset: number[];
        watchTime: Date[];
        difference: number[];
        roundTrip: number[];
      } = {
        id: this.watchName,
        device: this.deviceId,
        trial: [],
        offset: [],
        watchTime: [],
        difference: [],
        roundTrip: [],
      };
      let nTrials = settings.syncronizationTrials;
      let trial: number = 0;
      let timeStart: Date;
      let offset = settings.startOffset; // Estimate time to transmit/write time on watch (ms)
      this._connect(
        () => {
          // Get server time and send to watch
          timeStart = new Date();
          this._write(
            `setTime('${(timeStart.getTime() + offset) / 1000}');print(getTime());`,
            false,
          );
        },
        (data: any) => {
          if (trial < nTrials) {
            // Recieve watch time; get current time; then compare
            let timeEnd: Date = new Date();
            trialData.trial.push(trial);
            trialData.offset.push(offset);
            let watchTime: Date = new Date(parseFloat(data) * 1000);
            trialData.watchTime.push(watchTime);
            let roundTrip: number = timeEnd.getTime() - timeStart.getTime();
            // Estimate the moment time is written on watch
            let estimatedWriteTime = (roundTrip - settings.watchDelay) / 2;
            // NOTE: assumed to write time in middle of round-trip (divide roundTrip by 2)
            let diff: number =
              timeEnd.getTime() - watchTime.getTime() - estimatedWriteTime;
            trialData.difference.push(diff);
            // Get the time it took to send->set->recieve
            trialData.roundTrip.push(roundTrip);

            // on the last trial, use the average of last n trials
            if (trial == nTrials - 1) {
              // TODO: find a package with mean function???? otherwise this weird slice function
              this.avgOffset =
                trialData.offset
                  .slice(-settings.setTrialAverage)
                  .reduce((a, c) => a + c, 0) / settings.setTrialAverage;
              offset = this.avgOffset;
            } else {
              // Set new offset to difference between recieved time and actual (end) time
              offset += diff;
            }

            trial++;
            // Try writing time again with new offset
            timeStart = new Date();
            this._write(
              `if(1)syncTime('${(timeStart.getTime() + offset) / 1000}');`,
              false,
            );
          } else if (trial == nTrials) {
            // save the estimated difference
            this.timeSyncAccuracy = trialData.difference.at(-1) ?? "Error";
            this.getInfoSingle("timeSync");
            this._write(`if(1)draw();print("Done");`, false);
            trial++;
          } else {
            // this.driftTimeout = setInterval(
            //   this.getDriftEstimate,
            //   settings.driftPollingInterval,
            // );
            this._disconnect();
            this._logging(
              `AverageOffset: ${this.avgOffset}, EstimatedAccuracy: ${this.timeSyncAccuracy}`,
            );
            this._logging(JSON.stringify(trialData));
          }
          setTimeout(() => {
            resolve();
          }, settings.delay);
        },
      );
    });
  }

  // Estimate the current drift on the watch
  getDriftEstimate() {
    if (typeof this.avgOffset == "number") {
      return new Promise<void>((resolve) => {
        let serverTime: Date = new Date();
        let offsetTime = (serverTime.getTime() + this.avgOffset) / 1000;
        this._connect(
          () => {
            // 'sendWatchId' is a part of watch app, returns the watch id
            this._write(`getDrift(${offsetTime});`);
          },
          (data: any) => {
            // data = Number(data);
            let diff = offsetTime - data;
            this._logging(
              `[Estimate Drift] server: ${serverTime}, avgOffset: ${this.avgOffset}, offsetTime: ${offsetTime}, data: ${data}, difference: ${diff}`,
            );
            //console.log(offsetTime - data);
            this._disconnect();
            setTimeout(() => {
              resolve();
            }, settings.delay);
          },
        );
      });
    }
  }

  // The physical id is configured when loading the watch app (from the Bangle.js App Loader)
  getPhysicalId() {
    return new Promise<void>((resolve) => {
      this._connect(
        () => {
          // 'sendWatchId' is a part of watch app, returns the watch id
          this._write(`sendWatchId();`);
        },
        (data: any) => {
          // Store as watchName
          if (data.startsWith("[INFO]")) {
            this.watchName = "N/A";
          } else {
            this.watchName = data.replace(/(\r\n>)|(>)/, "");
          }
          this._logging(`got id: ${this.watchName}`);
          this.getInfoSingle("watchName");
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, settings.delay);
        },
      );
    });
  }

  // Retrieve a list of all storage files on the watch
  getStorageInfo() {
    return new Promise<void>((resolve) => {
      this._connect(
        () => {
          this._write(`if(1)sendStorage();`);
        },
        (data: string) => {
          this.storage = data
            .replace(/(\x01)|(\r\n)|(\\r\\n)|(>)/g, "")
            .split(",");
          console.log(this.storage);
          this.getInfoSingle("storage");
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, settings.delay);
        },
      );
    });
  }

  /* Bluetooth send commands to watch, JS function run on watch
   Initiate 'sendData()' on watch. The watch opens specified storage file
    and sends data line by line for processing */
  getDataFile(fileName: string) {
    let dataBuffer: string = ""; // data are sent in packets, required for parsing
    let recievedFile: string[] = []; // store clean lines of data
    let receivedFileName = Date.now().toString(); // Default filename
    return new Promise<void>((resolve) => {
      this._connect(
        () => {
          this._write(`if(1)sendData('${fileName}')`); // TODO: Why 'if(1)' -- no docs...
        },
        (data: string) => {
          dataBuffer += data; // add packet to buffer
          let line: string[] = [];
          line = dataBuffer.split("\r\n"); // this is a full line
          dataBuffer = line.pop() ?? ""; // buffer now equals part of next line
          line.forEach((e) => {
            let ln: string = e.replace(/\r|>|/g, ""); // remove weird carriage returns
            ln = ln.replace(/^\x1b?\[J/, ""); // and characters
            if (ln.length != 0) {
              if (ln.includes("[INFO] Sending file")) {
                this.progressMsg = ln; // display progress
              } else if (ln.includes("[Progress]")) {
                this.progressMsg = ln;
                this.getInfoSingle("progress");
              } else if (ln.includes(`{"File":`)) {
                // Parse the filename
                if (ln.includes("_W")) {
                  receivedFileName =
                    "2024-" + // TODO: change hard code
                    (
                      ln
                        ?.match(/\"Name\":\"(..-..T..:..:.._...._W...)/)
                        ?.at(1) ?? "Error"
                    )
                      ?.replace(/:/g, "-")
                      ?.replace("T", "_time_") +
                    ".csv";
                }
                recievedFile.push(ln); // add json line to file (line 1)
              } else if (ln.includes("START_RECORD")) {
                recievedFile.push(ln); // add json line to file (line 2)
              } else if (ln.includes("STOP_RECORD")) {
                recievedFile.push(ln); // add json line to file (last line)
              } else if (ln.includes("[INFO] Reached EOF")) {
                // When watch reaches end of storage file
                this.progressMsg = ln;
                this.getInfoSingle("progress");
                // this.downloads.push(recievedFile);
                try {
                  // write file to computer
                  fs.writeFile(
                    settings.directory.transferredData + receivedFileName,
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
          }, settings.delay);
        },
      );
    });
  }

  // If device is in range, set nearby for 10s
  set setNearby(rssi: number) {
    this.nearby = rssi;
    this.setState = 0;
    clearTimeout(this.nearbyTimeout);
    this.getInfoSingle("nearby");

    this.nearbyTimeout = setTimeout(() => {
      this.nearby = "na";
      this.setState = 10;
      this.getInfoSingle("nearby");
    }, settings.nearbyTimeout);
  }

  // state is set in watch's advertisement id
  set setState(state: number) {
    switch (state) {
      case 0:
        this.state = "Waiting";
        break;
      case 1:
        this.state = "Recording";
        break;
      case 2:
        this.state = "Sending"; // does not work (no debug yet)
        break;
      default:
        this.state = "Unknown";
    }
    this.getInfoSingle("state");
  }

  // Call 'startRecord()' on watch
  startRecording() {
    return new Promise<void>((resolve) => {
      this._connect(
        () => {
          this._write("startRecord();");
        },
        (data) => {
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, settings.delay);
        },
      );
    });
  }

  // Call 'stopRecord()' on watch
  stopRecording() {
    return new Promise<void>((resolve) => {
      this._connect(
        () => {
          this._write("stopRecord();");
        },
        (data: string) => {
          this._disconnect();
          setTimeout(() => {
            resolve();
          }, settings.delay);
        },
      );
    });
  }

  // Call 'startStream()' on watch
  startStreaming() {
    let dataBuffer: string = ""; // data are sent in packets, required for parsing
    let receivedData: string[] = []; // store clean lines of data
    return new Promise<void>((resolve) => {
      this._connect(
        () => {
          this._write("startStreaming();");
        },
        (data: string) => {
          dataBuffer += data; // add packet to buffer
          let line: string[] = [];
          line = dataBuffer.split("\r\n"); // this is a full line
          dataBuffer = line.pop() ?? ""; // buffer now equals part of next line
          line.forEach((e) => {
            let ln: string = e.replace(/\r|>|/g, ""); // remove weird carriage returns
            ln = ln.replace(/^\x1b?\[J/, ""); // and characters
            if (ln.length != 0) {
              // TODO: Process binary data
              //
              let a = new Uint8Array(ln.split(",").map(Number));
              let obs: object | string = ""; // TODO: type
              if (a.byteLength == 19) {
                let d = new DataView(a.buffer);
                obs = {
                  dt: d.getFloat64(0),
                  hrmBpm: d.getUint8(8),
                  hrmConf: d.getUint8(9),
                  hrmRaw: d.getInt16(10),
                  hrmFilt: d.getInt16(12),
                  accX: d.getInt8(14),
                  accY: d.getInt8(15),
                  accZ: d.getInt8(16),
                  accDiff: d.getUint8(17),
                  accMag: d.getUint8(18),
                };
                this.progressMsg = `Streaming: ${obs.hrmBpm}`; // display progress
                this.getInfoSingle("progress");

                let info: info = {
                  DeviceID: this.deviceId,
                  component: "liveData",
                  value: obs,
                };
                this.emit("watchInfoSingle", info);
              }
              // console.log(obs);
            }
          });
          setTimeout(() => {
            resolve();
          }, settings.delay);
        },
      );
    });
  }

  // Call 'stopStream()' on watch
  stopStreaming() {
    return new Promise<void>((resolve) => {
      this._write("stopStreaming();");
      setTimeout(() => {
        this._disconnect(); // TODO: FIX HERE!!!!
      }, settings.delay);
    });
  }

  // Manually send an event to watch
  // ** 'deleteStorage("all");' ** to delete all storage files
  //    'deleteStorage("fileName");' to delete specified file
  sendEvent(msg: string) {
    return new Promise<void>((resolve) => {
      let connectionTimeout: ReturnType<typeof setTimeout>;
      this._connect(
        () => {
          this._write(msg);
        },
        (data: string) => {
          this._logging(data);
          clearTimeout(connectionTimeout); // No end of list is sent by watch, so just timeout
          connectionTimeout = setTimeout(() => {
            this._disconnect();
          }, 1000); // TODO: ?
          setTimeout(() => {
            resolve();
          }, settings.delay);
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
    if (this.connected) {
      this._logging("ERROR: Already connected!");
      return;
    }
    this._logging(`Connecting...`);
    if (this.peripheral) {
      try {
        this.peripheral.connect((error) => {
          if (error) {
            this._logging("ERROR: Connecting to device");
            this.peripheral = undefined;
            this.peripheralUpdated = false;
            this.connected = false;
            this.getInfoSingle("connected");
            return;
          }
          this.connected = true;
          this.getInfoSingle("connected");
          this.peripheral?.discoverAllServicesAndCharacteristics(
            (error, services, characteristics) => {
              function findByUUID(list: any, uuid: string) {
                for (var i = 0; i < list.length; i++)
                  if (list[i].uuid == uuid) return list[i];
                return undefined;
              }
              var btUARTService = findByUUID(
                services,
                settings.uuid.btUARTService, // BT protocol: see config.ts
              );
              this.txCharacteristic = findByUUID(
                characteristics,
                settings.uuid.txCharacteristic,
              );
              this.rxCharacteristic = findByUUID(
                characteristics,
                settings.uuid.rxCharacteristic,
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
                this.peripheral?.disconnect();
                this.txCharacteristic = undefined;
                this.rxCharacteristic = undefined;
                this.peripheral = undefined;
                return;
              }
              this.rxCharacteristic.on("data", (data: any) => {
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
    } else {
      this._logging("No peripheral");
    }
  }

  /** Formats command and sends to watch
   * @param cmd - command string to send to watch
   * @param log - option to supress writing to log file
   * */
  _write(cmd: string, log: boolean = true) {
    /* \x03 -> Clear line (previous cmd that may be on device)
     * \x10 -> Disable terminal echo (on device, which stops cmd from being
     *   sent back to node) */
    let data = `\x03\x10${cmd}\n`;
    if (!this.peripheral) throw new Error("Not connected");
    let writeAgain = () => {
      if (!data.length) return;
      var d = data.substring(0, 20);
      data = data.substring(20);
      var buf = Buffer.alloc(d.length);
      for (var i = 0; i < buf.length; i++) buf.writeUInt8(d.charCodeAt(i), i);
      this.txCharacteristic.write(buf, false, writeAgain);
    };
    if (log) {
      this._logging(`Writing '${cmd}'`);
    }
    writeAgain();
  }

  _disconnect() {
    this._logging("Disconnecting");
    try {
      this.peripheral?.disconnect();
    } catch (err) {
      this._logging(err);
    }
    this.connected = false;
    this.getInfoSingle("connected");
  }

  // Timestamp logs
  _logging(msg: any) {
    logger.log("info", `DEVICE: '${this.deviceId}' ${msg}`);
  }
}

export { WatchDevice };

// TODO: TS style function definitions
