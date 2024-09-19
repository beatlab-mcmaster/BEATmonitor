# Record cardiac activity with Bangle.js 2 smartwatch

## Main publication

[link](TODO)

### Authors

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

Then run

```bash
npm run test
```

### 5. Web application

With the server started, open a web browser and go to
[localhost:3001](localhost:3001).

## Usage

If the server has successfully started, you should see a page that looks
like this: [TODO: update img]

![The Bangle.js 2 application dashboard](res/images/dashboard.png)

### 1. Setup location

Setting up the host computer (likely your computer running this server
program) is important because Bluetooth range is limited (to approx. 100
meters) and can be affected by objects/walls, so watches will vary in
connection strength. It is best top position the host computer in the
same room and centrally within 50 meters of all watches.

### 2. Search for watches

When first opening the dashboard, the Bluetooth radio is turned off and
not searching for devices.

- Click the **Search for watches** toggle to search for nearby
  Bangle.js 2 watches.

When a new watch is found, it will be added to the list of watches.

### 3. Synchronize watches

To ensure that the time stamps for multiple watches are accurate, the
synchronization function should be run before recording.

- To synchronize all watches, click **All Sync Time**.

- Or, to synchronize a single watch, click **Sync Time** on the
  corresponding watch in the list.

The dashboard will connect to each watch and use the host computer's
time to set the time on the watch (Note: this is an estimate since the
time can only be set via Bluetooth; time should be accurate to within
0--40 ms).

### 4. Attach watches to participants

Watches should be checked to ensure they are snug (but not too tight)
against participants' wrists. The watch face should not move or slide
around with participants' arm movements (this affects the quality of the
PPG recording as the sensor is very sensitive to motion artifacts).

### 5. Start recording

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

### 6. Stop recording

To stop recording:

- On all watches (within connection range), click **All** **STOP
  Recording** near the top of the dashboard.

- Or, to start a single watch, click **Stop Recording** on the
  corresponding watch in the list.

When the watch has stopped recording, the **State** box for that watch
will return to normal color and display **'Waiting'**.

### 7. Search for recordings

To find previous recordings on the watches:

- To search all watches, click **All Get Storage Info** near the top
  of the dashboard.

- To search a single watch, click **Get Storage Info** on the
  corresponding watch in the list.

Files that are found will be displayed in the dropdown list for each
watch in the list.

### 8. Transfer recordings

The Bluetooth technology on the watches is 'low energy', which is
optimal for battery life, but leads to relatively slow data transfer
rates. The stored recordings on the watch, depending on the length of
the record, can take _20--30 minutes per hour_ of data.

To transfer a file:

- Search for recordings on a watch (Step 7).

- Select the desired record and click **Get Selected File**.

The transfer progress will be displayed in the **Progress** box and will
change to **'[INFO] Reached EOF'** when completed.

### 9. Delete stored recordings

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

## Troubleshooting

[TODO: need feedback]

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
