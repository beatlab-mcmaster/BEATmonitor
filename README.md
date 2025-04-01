<!-- NOTE: ROOT PROJECT README -->

# Record cardiac activity with Bangle.js 2 smartwatch

## Main publication

Publication forthcoming (see our [poster](https://mayabflannery.github.io/projects/pdfs/neuromusic-20.pdf))

### Authors

Maya B. Flannery, Lauren Fink

## Overview

BEATMonitor is a system for collecting cardiac activity data from multiple individuals simultaneously in naturalistic environments. The system uses open-source and low-cost technology ([Bangle.js 2](https://banglejs.com) smartwatches) to ensure it is accessible and shareable. We hope that the system is easy to setup and use, making it practical for diverse research and other applications. Additionally, the system aims to be customizable and easy to modify for other purposes, while also being well-tested to guarantee reliability. We encourage feedback to be used for further development and improvements.

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

## Methods

Using open source Bangle.js 2 smartwatches, we developed a custom watch application to collect raw PPG samples from multiple participants at 25 Hz for up to three hours. A Bluetooth-connected dashboard was also designed to monitor and control multiple watches remotely, enabling watches to be synchronized with stimuli presentation and also minimizing participant disruption during data collection. Data generated are precise time-series from which pulse rate metrics can be extracted.

## Troubleshooting

Create an [issue](https://github.com/beatlab-mcmaster/BEATmonitor/issues).

## Studies

Research studies using BEATMonitor have included:

[The Innocents](https://brighterworld.mcmaster.ca/articles/livelab-the-innocents-lauren-fink-music-social-justice/)

[Voices](https://tanialacariastudio.com/collections/voices-thats-what-she?srsltid=AfmBOooB8iRLq6Oe8Gz4vZwJFEkG3Y_a8HBGBC4dHEhswf7bd8ZY3WmS)

[Synaptic Rodeo](https://livelab.mcmaster.ca/events/livelab-10th-anniversary-double-pendulum-synaptic-rodeo/)

[John Ellison](https://livelab.mcmaster.ca/events/livelab-10th-anniversary-john-ellison-some-kind-of-wonderful/)

[Santee Smith]()

[Debate]()
