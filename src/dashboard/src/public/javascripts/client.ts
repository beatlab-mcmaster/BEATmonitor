import { io } from "../../../node_modules/socket.io/client-dist/socket.io.esm.min.js";
//import { addButtons, addWatch, updateWatch } from "./interface.js";

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
    if (data.component == "storage") {
      let updateStorage = document.getElementById(
        `storageList-${data.DeviceID}`,
      );
      data.value.forEach((e) => {
        console.log(e);
        let option = document.createElement("option");
        option.value = e;
        option.innerHTML = e;
        updateStorage.appendChild(option);
      });
    } else {
      let updateElement = document.getElementById(
        `${data.DeviceID}-${data.component}`,
      );
      updateElement.textContent = data.value;
    }
  } else {
  }
});

/** Emits signal to server
 * ...
 * */
const watchDivs = [
  "watchName",
  "device",
  "nearby",
  "connected",
  "state",
  "timeSync",
  "storage",
  "progress",
  "buttons",
];

const watchIcons = {
  tWatch: {
    img: "/images/id-card-clip-svgrepo-com.svg",
    alt: "Watch/Participant",
  },
  // "/images/id-card-clip-svgrepo-com-hl.svg"
  // "Watch/Participant"
  tDevice: { img: "/images/watch-square-svgrepo-com.svg", alt: "Device" },
  // "/images/bluetooth-svgrepo-com.svg"
  // "Bluetooth on"
  tNearby: {
    img: "/images/bluetooth-off-svgrepo-com.svg",
    alt: "Bluetooth off",
  },
  tConnected: { img: "", alt: "" },
  tState: {
    img: "/images/waiting-arrow-svgrepo-com.svg",
    alt: "Watch is waiting",
  },
  // "/images/recording-sharp-svgrepo-com.svg"
  // "Watch is recording"

  tTimeSync: {
    img: "/images/clock-circle-svgrepo-com-red.svg",
    alt: "Time not synchronized",
  },
  // "/images/clock-circle-svgrepo-com-green.svg"
  // "Time synchronized"
  tStorage: { img: "/images/files-svgrepo-com.svg", alt: "Files" },
  tProgress: {
    img: "/images/progress-arrows-svgrepo-com.svg",
    alt: "Progress idle",
  },
  // "/images/progress-arrows-svgrepo-com-prog.svg"
  // "Progress working"
  na: { img: "", alt: "" },
};

let emitCommand = function (cmd: string, device: string, msg: string): void {
  console.log(`emitCommand: cmd=${cmd}; device=${device}; msg=${msg}`);
  socket.emit("btn-click", { cmd, device, msg });
};

let addButtons = function (
  id: string,
  btns: { [key: string]: string },
  device: "all",
): void {
  let selElement = document.getElementById(id);
  if (selElement != null) {
    for (var b in btns) {
      let newButton = document.createElement("button");
      let msg = "";
      newButton.className = "btn-control";
      newButton.id = `btn-${device}-${b}`;
      newButton.value = b;
      newButton.textContent = btns[b];
      newButton.addEventListener("click", (e) => {
        if (e.target != null) {
          // @ts-ignore 'value' should exist on button
          if (e.target.value == "sendCommand") {
            // @ts-ignore 'value' should exist on button
            msg = document.getElementById(`txtbox-${device}`).value;
          }
          // @ts-ignore 'value' should exist on button
          emitCommand(e.target.value, device, msg);
        }
      });
      selElement.appendChild(newButton);
    }
    let newTextbox = document.createElement("input");
    newTextbox.className = "textbox";
    newTextbox.id = `txtbox-${device}`;
    selElement.appendChild(newTextbox);
  } else {
    console.error(`Failed to add buttons to '${id}'`);
  }
};

let addWatch = function (id: string, deviceId: string) {
  console.log("adding: ", id, deviceId);
  let selElement = document.getElementById(id);
  let watchContainer = document.createElement("div");
  watchContainer.className = "watchContainer";
  watchContainer.id = `${deviceId}-watchContainer`;
  watchDivs.forEach((e) => {
    let childContainer = document.createElement("div");
    childContainer.className = e;
    childContainer.id = `${deviceId}-${e}`;
    childContainer.textContent = "";
    watchContainer.appendChild(childContainer);
  });
  for (const [section, icon] of Object.entries(watchIcons)) {
    let childContainer = document.createElement("img");
    childContainer.className = [section, "icon-sm"].join(" ");
    childContainer.id = `${deviceId}-${section}`;
    childContainer.src = icon.img;
    childContainer.alt = icon.alt;
    childContainer.title = icon.alt;
    watchContainer.appendChild(childContainer);
  }
  selElement.appendChild(watchContainer);
  // Add storage dropdown
  let newStorage = document.createElement("select");
  newStorage.id = `storageList-${deviceId}`;
  newStorage.style = `width: 200px;`;
  document.getElementById(`${deviceId}-storage`).appendChild(newStorage);
};

let updateWatch = function (data) {
  console.log(data);
  document.getElementById(`${data.DeviceID}-${"watchName"}`).textContent =
    data.watchName;
  document.getElementById(`${data.DeviceID}-${"device"}`).textContent =
    data.DeviceID;
  document.getElementById(`${data.DeviceID}-${"progress"}`).textContent =
    data.Progress;
  document.getElementById(`${data.DeviceID}-${"connected"}`).textContent =
    data.Connected;
  document.getElementById(`${data.DeviceID}-${"state"}`).textContent =
    data.state;
  document.getElementById(`${data.DeviceID}-${"timeSync"}`).textContent =
    data.TimeSyncAccuracy;
};

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
