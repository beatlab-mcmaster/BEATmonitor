/** client.ts
 * Author: Maya B. Flannery
 * Description: This script handles socket communication with the web server,
 * and initializes and handles UI functions. */

import { io } from "../../../node_modules/socket.io/client-dist/socket.io.esm.min.js";
// import * as CanvasJS from "../../../node_modules/@canvasjs/charts/canvasjs.min.js";

// Message handling
const socket = io();

socket.on("connect", () => {
  // If connected to server
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

socket.on("clearAll", () => {
  // Clear watchList if reconnecting
  let el = document.getElementById("watchList");
  el ? (el.innerHTML = "") : console.log("clearAll: watchlist is null");
});

socket.on("info", (data: object) => {
  // Info messages from server
  console.log(data);
});

socket.on("watch", (data: object) => {
  // Watch messages from server
  console.log(data);
});

// Received when a watchDevice instance is created
socket.on("watchInfoAll", (data) => {
  if (document.getElementById(`${data.deviceId}-watchContainer`) != undefined) {
    // Update existing watch
    updateWatch(data);
  } else {
    // Add new watch to list
    addWatch("watchList", data.deviceId);
    addButtons(`${data.deviceId}-buttons`, ctlButtons, data.deviceId);
  }
});

let sample = 0;

// Update UI as single watch properties are updated
socket.on("watchInfoSingle", (data) => {
  if (document.getElementById(`${data.deviceId}-watchContainer`) != undefined) {
    let elp = document.getElementById(`${data.deviceId}-watchContainer`)!;
    switch (data.component) {
      case "connected":
        data.value
          ? updateIcon(`${data.deviceId}-tConnected`, icons.connected)
          : updateIcon(`${data.deviceId}-tConnected`, icons.notConnected);
        break;
      case "progress":
        updateText(`${data.deviceId}-${data.component}`, data.value);
        break;
      case "watchName":
        console.log(data);
        updateText(`${data.deviceId}-${data.component}`, data.value);
        break;
      case "nearby":
        updateText(`${data.deviceId}-${data.component}`, data.value);
        if (data.value < 1) {
          updateIcon(`${data.deviceId}-tNearby`, icons.btNear);
          elp.style.opacity = "100%";
        } else {
          updateIcon(`${data.deviceId}-tNearby`, icons.btNotNear);
          elp.style.opacity = "70%";
        }
        break;
      case "state":
        updateText(`${data.deviceId}-${data.component}`, data.value);
        // states:  Waiting / Recording / Sending / Unknown
        if (data.value == "Recording") {
          updateIcon(`${data.deviceId}-tState`, icons.stateRecording);
          elp.style.backgroundColor = "maroon";
        } else if (data.value == "Waiting") {
          updateIcon(`${data.deviceId}-tState`, icons.stateWaiting);
          elp.style.backgroundColor = "rgb(37, 37, 37)";
        } else {
          updateIcon(`${data.deviceId}-tState`, icons.stateUnknown);
          elp.style.backgroundColor = "rgb(37, 37, 37)";
        }
        break;
      case "timeSync":
        updateText(`${data.deviceId}-${data.component}`, data.value);
        data.value != "Not synced!"
          ? updateIcon(`${data.deviceId}-tTimeSync`, icons.synced)
          : updateIcon(`${data.deviceId}-tTimeSync`, icons.notSynced);
        break;
      case "storage":
        // Add file list to storage selector
        let updateStorage = document.getElementById(
          `storageList-${data.deviceId}`,
        )!;
        data.value.forEach((e: string) => {
          console.log(e);
          let option = document.createElement("option");
          option.value = e;
          option.innerHTML = e;
          updateStorage.appendChild(option);
        });
        break;
      case "liveData":
        // console.log(data);
        sample++;
        if (sample % 20 == 0) {
          sample = 0;
          updateChart(data);
        }
        break;
      default:
        let updateElement = document.getElementById(
          `${data.deviceId}-${data.component}`,
        )!;
        updateElement.textContent = data.value;
    }
  } else {
  }
});

// Elements of a 'watchContainer' listed in UI
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

type icon = { img: string; alt: string };
// Icon file paths and descriptions
const icons: { [key: string]: icon } = {
  watchNorm: {
    img: "/images/id-card-clip-svgrepo-com.svg",
    alt: "Watch/Participant",
  },
  watchHL: {
    img: "/images/id-card-clip-svgrepo-com-hl.svg",
    alt: "Watch/Participant",
  },
  device: { img: "/images/watch-square-svgrepo-com.svg", alt: "Device" },
  btNear: { img: "/images/bluetooth-svgrepo-com.svg", alt: "Bluetooth on" },
  btNotNear: {
    img: "/images/bluetooth-off-svgrepo-com.svg",
    alt: "Bluetooth off",
  },
  notConnected: {
    img: "/images/link-slash-alt-svgrepo-com.svg",
    alt: "Not connected to device",
  },
  connected: {
    img: "/images/link-alt-svgrepo-com.svg",
    alt: "Connected to device",
  },
  stateUnknown: {
    img: "/images/question-circle-svgrepo-com.svg",
    alt: "Unknown state",
  },
  stateWaiting: {
    img: "/images/waiting-arrow-svgrepo-com.svg",
    alt: "Watch is waiting",
  },
  stateRecording: {
    img: "/images/recording-sharp-svgrepo-com.svg",
    alt: "Watch is recording",
  },
  notSynced: {
    img: "/images/clock-circle-svgrepo-com-red.svg",
    alt: "Time not synchronized",
  },
  synced: {
    img: "/images/clock-circle-svgrepo-com-green.svg",
    alt: "Time synchronized",
  },
  noStorage: { img: "/images/files-svgrepo-com.svg", alt: "Files" },
  progressIdle: {
    img: "/images/progress-arrows-svgrepo-com.svg",
    alt: "Progress idle",
  },
  progressWorking: {
    img: "/images/progress-arrows-svgrepo-com-prog.svg",
    alt: "Progress working",
  },
  na: { img: "", alt: "" },
};

// Default icons
const watchIcons = {
  tWatch: icons.watchNorm,
  tDevice: icons.device,
  tNearby: icons.btNotNear,
  tConnected: icons.notConnected,
  tState: icons.stateUnknown,
  tTimeSync: icons.notSynced,
  tStorage: icons.noStorage,
  tProgress: icons.progressIdle,
  na: icons.na,
};

// Icons can be updated as watch parameters change
let updateIcon = function (id: string, icon: icon): void {
  let img = document.getElementById(id) as HTMLImageElement;
  img.src = icon.img;
  img.alt = icon.alt;
  img.title = icon.alt;
};

// Text can be updated as watch parameters change
let updateText = function (id: string, txt: string): void {
  let el = document.getElementById(id)!;
  el.textContent = txt;
};

// Object sent to server when buttons are clicked
let emitCommand = function (cmd: string, device: string, msg: string): void {
  console.log(`emitCommand: cmd=${cmd}; device=${device}; msg=${msg}`);
  socket.emit("btn-click", { cmd, device, msg });
};

// Function to add buttons and listeners for each watch added to the list
let addButtons = function (
  id: string,
  btns: { [key: string]: string },
  device: "all",
): void {
  let selElement = document.getElementById(id);
  if (selElement != null) {
    // Add each button
    for (var b in btns) {
      let newButton = document.createElement("button");
      let msg = "";
      newButton.className = "btn-control";
      newButton.id = `btn-${device}-${b}`;
      newButton.value = b;
      newButton.textContent = btns[b];
      // Buttons emit command to server when clicked
      newButton.addEventListener("click", (e: MouseEvent) => {
        let btn = e.target as HTMLButtonElement;
        if (btn != null) {
          if (btn.value == "sendCommand") {
            // With sendCommand, also send textbox value
            let el = document.getElementById(
              `txtbox-${device}`,
            ) as HTMLInputElement;
            msg = el.value;
          } else if (btn.value == "getFiles") {
            if (device == "all") {
              // TODO: Clean up
              // Get all watch names
              let watches = document.querySelectorAll(
                `[id$="-watchContainer"]`,
              );
              watches.forEach((l) => {
                // Trim watch id
                let watch = l.id.replace("-watchContainer", "");
                // Get selected storage file related to watch
                let el = document.getElementById(
                  `storageList-${watch}`,
                ) as HTMLSelectElement;
                msg = el.value;
                // Emit command for each watch
                emitCommand(btn.value, watch, msg);
              });
              return;
            } else {
              // Send the name of the selected file
              let el = document.getElementById(
                `storageList-${device}`,
              ) as HTMLSelectElement;
              msg = el.value;
            }
          }
          // @ts-ignore 'value' should exist on button
          emitCommand(btn.value, device, msg);
        }
      });
      selElement.appendChild(newButton);
    }
    // Add input for low-level commands to watch
    let newTextbox = document.createElement("input");
    newTextbox.className = "textbox";
    newTextbox.id = `txtbox-${device}`;
    selElement.appendChild(newTextbox);
  } else {
    console.error(`Failed to add buttons to '${id}'`);
  }
};

// Create a watchContainer for each watch
let addWatch = function (id: string, deviceId: string) {
  console.log("adding: ", id, deviceId);
  let selElement = document.getElementById(id)!;
  let watchContainer = document.createElement("div");
  watchContainer.className = "watchContainer";
  watchContainer.id = `${deviceId}-watchContainer`;
  // Add individual watch components
  watchDivs.forEach((e) => {
    let childContainer = document.createElement("div");
    childContainer.className = e;
    childContainer.id = `${deviceId}-${e}`;
    childContainer.textContent = "";
    watchContainer.appendChild(childContainer);
  });
  // Add icons
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
  newStorage.style.width = `200px;`;
  document.getElementById(`${deviceId}-storage`)!.appendChild(newStorage);
};

// TODO: combine with single update function
let updateWatch = function (data) {
  console.log(data);
  document.getElementById(`${data.deviceId}-${"watchName"}`)!.textContent =
    data.watchName;
  document.getElementById(`${data.deviceId}-${"device"}`)!.textContent =
    data.deviceId;
  document.getElementById(`${data.deviceId}-${"progress"}`)!.textContent =
    data.Progress;
  document.getElementById(`${data.deviceId}-${"state"}`)!.textContent =
    data.state;
  document.getElementById(`${data.deviceId}-${"timeSync"}`)!.textContent =
    data.TimeSyncAccuracy;
};

// Create UI
let ctlButtons = {
  sync: "Sync Time",
  streamStart: "Start Stream",
  streamStop: "Stop Stream",
  sendCommand: "Send Cmd: ",
};

addButtons("main-controls", ctlButtons, "all");

// TODO: collapsible
// TODO: explain symbols/offsets/...
// TODO: center title/padding

//Chart Setup

window.onload = function () {
  chart.render();
};

var chart = new CanvasJS.Chart("container", {
  theme: "dark2",
  backgroundColor: "#000000",
  title: {
    text: "Live Data",
  },
  axisY: {
    title: "Heart rate (bpm)",
    gridColor: "#1E1E1E",
    gridThickness: 1,
    minimum: 40,
    maximum: 200,
  },
  axisX: {
    title: "Time",
    valueFormatString: "", //"mm:ss",
    labelFormatter: function () {
      return " ";
    },
  },
  // toolTip: {
  //   shared: "true",
  // },
  // legend: {
  //   cursor: "pointer",
  // },
  data: [],
});

var devices = [];
var dataLength = 30; // number of dataPoints visible at any point

var updateChart = function (data) {
  // If new device, add to chart
  if (data.deviceId in devices) {
    devices[`${data.deviceId}`].push({
      x: data.value.dt,
      y: data.value.hrmBpm,
      // y: data.value.hrmFilt,
    });
  } else {
    console.log(data);
    console.log(`creating new device: ${data.deviceId}`);
    devices[`${data.deviceId}`] = [
      {
        x: data.value.dt,
        // y: data.value.hrmFilt,
        y: data.value.hrmBpm,
      },
    ];
    chart.options.data.push({
      type: "line",
      name: data.deviceId,
      showInLegend: true,
      legendText: data.deviceId,
      dataPoints: devices[`${data.deviceId}`],
      markerType: "none",
    });
  }

  // For each device in data, shift when 200 items in array
  for (var d in devices) {
    if (devices[d].length > dataLength) {
      devices[d].shift();
    }
  }

  chart.render();
};
