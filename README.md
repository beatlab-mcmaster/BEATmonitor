# Record cardiac activity with Bangle.js 2 smartwatch

## Main publication

[link](TODO)

### Authors

Maya B. Flannery, Lauren Fink

## Overview

This project contains two applications:

1. A [Bangle.js 2](https://banglejs.com) watch application that records
   timestamped heart rate and raw PPG sensor data at \~25 Hz.
2. A node.js (local) web application that connects to multiple
   Bangle.js 2 watches via Bluetooth. This app allows for remote
   monitoring, start/stopping, time synchronization, and large file
   transfers.

## Setting up the Bangle.js 2 watches

See [Watch documentation](src/bangle/README.md)

## Setting up the multi-watch monitoring dashboard

See [Dashboard documentation](/src/dashboard/README.md)

## Troubleshooting

[TODO: need feedback]

## Resources

### Bangle.js programming

[Technical specs](https://www.espruino.com/Bangle.js2)

[Official app loader](https://banglejs.com/apps/)

[Tutorials](https://www.espruino.com/Bangle.js2#tutorials)

[API reference](https://www.espruino.com/Reference#software)

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

## Studies

[Innocents](TODO)

[Voices](TODO)
