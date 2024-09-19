/** Emits signal to server
 * ...
 * */
const watchDivs = [
  "buttons",
  "storage",
  "progress",
  "watchName",
  "nearby",
  "connected",
  "state",
  "timeSync",
  "device",
];

const watchTitles = {
  tName: "Watch",
  tDevice: "Device",
  tNearby: "Signal",
  tConnected: "Connected",
  tState: "State",
  tTime: "Time Sync",
  tStorage: "Storage",
  tProgress: "Progress",
};

let emitCommand = function (cmd: string, device: string): void {
  console.log(`emitCommand: cmd=${cmd}; device=${device}`);
};

let addButtons = function (
  id: string,
  btns: { [key: string]: string },
  device: "all" | "device",
): void {
  let selElement = document.getElementById(id);
  if (selElement != null) {
    for (var b in btns) {
      let newButton = document.createElement("button");
      newButton.className = "btn-control";
      newButton.id = `btn-${b}`;
      newButton.value = b;
      newButton.textContent = btns[b];
      newButton.addEventListener("click", (e) => {
        if (e.target != null) {
          // @ts-ignore 'value' should exist on button
          emitCommand(e.target.value, device);
        }
      });
      selElement.appendChild(newButton);
    }
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
  for (const [section, title] of Object.entries(watchTitles)) {
    let childContainer = document.createElement("div");
    childContainer.className = section;
    childContainer.id = `${deviceId}-${section}`;
    childContainer.textContent = title;
    watchContainer.appendChild(childContainer);
  }
  selElement.appendChild(watchContainer);
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

export { addWatch, updateWatch, addButtons };

// treat as a module, export functions only, code in main page
// functions:
//  add buttons [to main controls, to individual devices]
//  draw found device table
//  update device table
//  ...
