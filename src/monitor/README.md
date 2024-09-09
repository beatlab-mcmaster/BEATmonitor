## Description

Code for the node.js (local) web application that connects to multiple Bangle.js 2 watches via Bluetooth. This app allows for remote monitoring, start/stopping, time synchronization, and large file transfers.

## Installation

### 1. Install Node

Node.js is a free, open-source, and cross-platform environment that runs programs coded in JavaScript.

If you do not have Node.js installed on your system, download and install it from the official [Node.js](https://nodejs.org) website.

### 2. Download project source code

**Option 1:** Download from [GitHub](TODO) by clicking **Code** -\> **Download ZIP**.

**Option 2:** In a terminal, navigate to your projects directory and run:

`git clone <repo name>`

### 3. Initialize project

To download and install all required packages, navigate to `<project root>/src/monitord/` in a terminal, then run:

``` bash
npm install
```

### 4. Start node server

In the same directory (`<project root>/src/monitord/`), run:

``` bash
npm run test
```

or [TODO: gives error]

``` bash
npm run start
```

### 5. Web application

With the server started, open a web browser and go to [localhost:3000](localhost:3000).

## Files

### `server.js`

-   Starts web server (to display `dashboard.html`).

-   Loads `noble` module to control Bluetooth radio.

-   Establishes socket connection between server (noble) and client (dashboard interface).

### `public/dashboard.html`

-   Interface that displays nearby watch information.

-   Send and receive commands from all/single watches.

### `WatchDevice.js`

-   Class to manage watch device data (Bluetooth, file management, controls).

### `watchData.csv`

-   List of known watches

### `shared/libs/logger.js`

-   Used to create time stamped logs of server operation.
