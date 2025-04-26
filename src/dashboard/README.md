<!-- NOTE: DASHBOARD README -->

# Record cardiac activity with Bangle.js 2 smartwatch

## Authors

Maya B. Flannery, Lauren Fink

## Installation

### 1. Install Node

Node.js is a free, open-source, and cross-platform environment that runs
programs coded in JavaScript.

If you do not have Node.js installed on your system, download and
install it from the official [Node.js](https://nodejs.org) website.

### 2. Download project source code

**Option 1:** Download from [GitHub](TODO) by clicking **Code** -\>
**Download ZIP**.

**Option 2:** In a terminal, navigate to your projects directory and
run:

`git clone <repo name>`

### 3. Initialize project

To download and install all required packages, navigate to
`<project root>/src/dashboard/` in a terminal, then run:

```bash
npm install
```

### 4. Start node server

In the same directory (`<project root>/src/dashboard/`), run:

```bash
npm run build
```

Then run:

```bash
npm run test
```

### 5. Web application

With the server started, open a web browser and go to
[localhost:3001](localhost:3001).

## Usage

If the server has successfully started, you should see a page that looks
like this:

![The Bangle.js 2 application dashboard](/res/images/dashboard.png)

### Dashboard sections/indicators

![The Bangle.js 2 application dashboard](/res/images/watchContainer.png)

1. Watch name: this name is set when installing the BEATmonitor watch
   app (see: [instructions](/src/bangle/README.md)) and can be used to identify
   participants.
2. Watch device: this name is set by Bangle.js and is advertised by the
   device's Bluetooth radio.
3. Bluetooth connection: the Bluetooth icon is highlighted when a watch is
   detected nearby; the signal strength is shown: large negative numbers are
   lower strength than numbers near 0.
4. Connection icon: red when disconnected, green when connected; the dashboard
   application can only connect to ~7 devices at once; connections to a watch
   are only made when sending start/stop commands, synchronizing, or
   transferring files.
5. Watch action status: 'Unknown' - the watch may not be nearby; 'Waiting' -
   the watch is ready to record, synchronize, or transfer files; 'Recording' -
   the watch is recording and will not respond to commands other than 'Stop
   Rec' (item 14).
6. Synchronization status: (watch) device clocks will often slightly drift
   over time. Before recording, it is recommended to run 'Sync Time' (item
   12), which will set the time of each watch to that of the computer running
   the dashboard. The estimated offset (see additional notes) in ms is shown
   here.
7. Storage files: recorded data are stored as files directly on the watch. To
   retrieve the storage list, click 'Get Storage' (item 10). To download a file,
   select the desired file from the list, then click 'Get File' (item 11).
   Downloaded files are saved in `/src/dashboard/watchData/transferredData/`.
8. Information bar: information about the watch device and file transfers
   is shown here.
9. 'Get Name': searches the watch for its name (see item 1).
10. 'Get Storage': searches the watch for recorded data files.
11. 'Get File': transfers the selected file in the Storage file list (item 7)
    to the dashboard computer.
12. 'Sync Time': performs a time setting function to set the watch device
    clock to the dashboard computer clock.
13. 'Start Rec': creates a new record file on the watch and begins writing
    data.
14. 'Stop Rec': stops writing to a record file.
15. 'Send Cmd': send a specific function (written in item 16) to a device.
16. Command text box: a specific function can be written here and sent with
    'Send Cmd' (item 15).

### 1. Setup location

Setting up the host computer (likely your computer running this server
program) is important because Bluetooth range is limited (to approx. 100
meters) and can be affected by objects/walls, so watches will vary in
connection strength. It is best top position the host computer in the
same room and centrally within 50 meters of all watches.

### 2. Synchronize watches

To ensure that the time stamps for multiple watches are accurate, the
synchronization function should be run before recording.

- To synchronize all watches, click **All Sync Time**.

- Or, to synchronize a single watch, click **Sync Time** on the
  corresponding watch in the list.

The dashboard will connect to each watch and use the host computer's
time to set the time on the watch (Note: this is an estimate since the
time can only be set via Bluetooth; time should be accurate to within
0--40 ms).

### 3. Attach watches to participants

Attach the Bangle.js 2 watch snugly to the individual's wrist. Ideally, the
watch should not be too tight; but to minimize motion artifacts in the data
(which are low-quality and difficult to analyse), it is important that the
watch (i.e., the PPG sensor) does not move easily when the individual moves
their arm or body.

### 4. Start recording

To start recording:

- On all watches (within connection range), click **All** **START
  Recording** near the top of the dashboard.

- Or, to start a single watch, click **Start Recording** on the
  corresponding watch in the list.

When the watch has started recording, the **State** box for that watch
will turn red and display **'Recording'**.

A file will be created on the watch with the Watch ID and the start time
of the record. When a 'wrist' is detected, samples (HR, PPG, confidence)
will be added to the file approximately once every 40 ms until the watch
battery runs out, the storage capacity is reached, or **STOP Recording**
is clicked. Samples will not be written if the watch is removed.

### 5. Stop recording

To stop recording:

- On all watches (within connection range), click **All** **STOP
  Recording** near the top of the dashboard.

- Or, to start a single watch, click **Stop Recording** on the
  corresponding watch in the list.

When the watch has stopped recording, the **State** box for that watch
will return to normal color and display **'Waiting'**.

### 6. Search for recordings

To find previous recordings on the watches:

- To search all watches, click **All Get Storage Info** near the top
  of the dashboard.

- To search a single watch, click **Get Storage Info** on the
  corresponding watch in the list.

Files that are found will be displayed in the dropdown list for each
watch in the list.

### 7. Transfer recordings

The Bluetooth technology on the watches is 'low energy', which is
optimal for battery life, but leads to relatively slow data transfer
rates. The stored recordings on the watch, depending on the length of
the record, can take _20--30 minutes per hour_ of data.

To transfer a file:

- Search for recordings on a watch (Step 7).

- Select the desired record and click **Get Selected File**.

The transfer progress will be displayed in the **Progress** box and will
change to **'[INFO] Reached EOF'** when completed.

### 8. Delete stored recordings

[TODO: update] The current method for deleting files on the watch is to
manually send the command from the dashboard with the **'Event
message'** field:

> [!WARNING]
>
> Sending these commands will **PERMENANTLY DELETE** records from
> watches. They can not be recovered!

- To delete all files on all watches:

  - Type `deleteStorage("all");` in the **'Event message'** text
    box.

  - Click **Send Event** near the top of the dashboard.

- To delete one file on one watch:

  - Type `deleteStorage("<filename>");` in the **'Event message'**
    text box.

  - Click **Send Event** on the corresponding watch in the list.

## 9. Send custom commands

- `buzz(nTimes)`
- `changeState(newState)`
- `deleteStorage(files)`
- `getDrift()`
- `resetWatch()`
- `saveResponse()`
- `sendData(fileName)`
- `sendStorage()`
- `sendWatchId()`
- `setVibrate(time, strength)`
- `setWatchId(newId)`
- `startRecord()`
- `stopRecord()`
- `startStreaming()`
- `stopStreaming()`
- `syncTime()`
- `wait()`

## Troubleshooting

Create an [issue](https://github.com/beatlab-mcmaster/BEATmonitor/issues).

### `uncaught undefined` on boot

Only 2 of 40 watches have been observed to have this issue. It might be due to
a problem install programs or firmware.

This was fixed by updating the `boot` application on the AppLoader. Upgrading
`Bootloader` from `v5.9` -> `v6.5` solved the issue.

## Resources

### Web app programming

[Learn
Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
-- Introductory documentation

[Learn
JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) --
Documentation and tutorials

[TypeScript
basics](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
-- Introductory documentation

#### Dependencies

[express](https://expressjs.com/en/starter/hello-world.html) -- Serve
web pages with node

[socket.io](https://socket.io/docs/v4/) -- Client--server communication

[\@abandonware/noble](https://www.npmjs.com/package/@abandonware/noble)
-- Discover and connect to Bluetooth devices

[winston](https://www.npmjs.com/package/winston/v/2.4.6) -- Logging
library

[fs](https://nodejs.org/en/learn/manipulating-files/reading-files-with-nodejs)
-- File I/O

[csv-parse](https://www.npmjs.com/package/csv-parse) -- Parsing .csv
files
