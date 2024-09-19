import { io } from "../../../node_modules/socket.io/client-dist/socket.io.esm.min.js";
import { addButtons, addWatch, updateWatch } from "./interface.js";

// Message handling
const socket = io();

socket.on("connect", () => {
  console.log("Socket connected");
});

socket.on("connect_error", (err) => {
  // the reason of the error, for example "xhr poll error"
  console.log(err.message);
  // some additional description, for example the status code of the initial HTTP response
  console.log(err.description);
  // some additional context, for example the XMLHttpRequest object
  console.log(err.context);
});

socket.on("clearAll", (data) => {
  document.getElementById("watchList").innerHTML =
    "<h2>Bangle.js watch list</h2>";
});

socket.on("info", (data) => {
  console.log(data.msg);
});

socket.on("watch", (data) => {
  console.log(data);
});

socket.on("watchInfoAll", (data) => {
  console.log(data);
  if (document.getElementById(`${data.DeviceID}-watchContainer`) != undefined) {
    updateWatch(data);
  } else {
    addWatch("watchList", data.DeviceID);
    addButtons(`${data.DeviceID}-buttons`, ctlButtons, data.DeviceID);
  }
});

socket.on("watchInfoSingle", (data) => {
  if (document.getElementById(`${data.DeviceID}-watchContainer`) != undefined) {
    let updateElement = document.getElementById(
      `${data.DeviceID}-${data.component}`,
    );
    updateElement.textContent = data.value;
  } else {
  }
});

// Create UI
let ctlButtons = {
  sync: "Synchronize Time",
  recordStart: "Start Recording",
  recordStop: "Stop Recording",
  getStorageList: "Get Storage List",
  getFiles: "Get Files",
  sendCommand: "Send Command: ",
};

addButtons("main-controls", ctlButtons, "all");
