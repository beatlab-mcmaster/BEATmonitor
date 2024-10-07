<!-- NOTE: ROOT PROJECT README -->

# Record cardiac activity with Bangle.js 2 smartwatch

## Main publication

WIP

### Authors

Maya B. Flannery, Lauren Fink

## Overview

This project aims to develop a system for collecting cardiac activity data from multiple individuals simultaneously in naturalistic environments. The system uses open-source and low-cost technology ([Bangle.js 2](https://banglejs.com) smartwatches) to ensure it is accessible and shareable. We hope that the system is easy setup and use, making it practical for diverse research and other applications. Additionally, the system aims to be customizable and easy to modify for other purposes, while also being well-tested to guarantee reliability. We encourage feedback to be used for further development and improvements.

This project contains two applications:

1. A [Bangle.js 2](https://banglejs.com) smartwatch application that records
   timestamped heart rate and raw PPG sensor data at \~25 Hz.
2. A node.js (local) web application that connects to multiple
   Bangle.js 2 watches via Bluetooth. This app allows for remote
   monitoring, start/stopping, time synchronization, and large file
   transfers.

## Setup

This system was developed and tested (so far) on M1/M3 MacBooks (MacOS 14
Sonoma; MacOS 15 Sequoia).

> [!NOTE]
> Testing required:
>
> - [ ] Other Mac versions
> - [ ] Linux
> - [ ] Windows

### 1. Setting up the Bangle.js 2 watches

See [Watch documentation](src/bangle/README.md)

### 2. Setting up the multi-watch monitoring dashboard

See [Dashboard documentation](/src/dashboard/README.md)

## Troubleshooting

Create an [issue](https://github.com/beatlab-mcmaster/BEATmonitor/issues).

## Studies

Innocents

Voices
