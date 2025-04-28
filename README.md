<!-- NOTE: ROOT PROJECT README -->

# Record cardiac activity with Bangle.js 2 smartwatches

![Watches that are ready for a study!](/res/images/watches-ready.png)

## Main publication

Publication forthcoming (see our [poster](https://mayabflannery.github.io/projects/pdfs/neuromusic-20.pdf))

### Authors

Maya B. Flannery, Lauren Fink

## Overview

BEATMonitor is a system for collecting cardiac activity data from multiple individuals simultaneously in naturalistic environments.
The system uses open-source and low-cost technology ([Bangle.js 2](https://banglejs.com) smartwatches) to ensure it is accessible and shareable.
We hope that the system is easy to setup and use, making it practical for diverse research and other applications.
Additionally, the system aims to be customizable and easy to modify for other purposes, while also being well-tested to guarantee reliability.
We encourage feedback to be used for further development and improvements.

This project contains two applications:

1. A [Bangle.js 2](https://banglejs.com) smartwatch application that records timestamped heart rate and raw PPG sensor data at \~25 Hz.
2. A node.js (local) web application that connects to multiple Bangle.js 2 watches via Bluetooth. This app allows for remote monitoring, starting/stopping records, time synchronization, and large file transfers.

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

### 3. Post-processing data

See [Post-processing documentation and tutorial](/src/postprocess/README.md)

## Troubleshooting

Please let us know if you have any questions, problems, or suggestions by creating an issue [here](https://github.com/beatlab-mcmaster/BEATmonitor/issues/new).

## Studies

Research studies using BEATMonitor have included:

- [LIVELab 10th Anniversary: The Innocents](https://brighterworld.mcmaster.ca/articles/livelab-the-innocents-lauren-fink-music-social-justice/)
- [VOICES (That's What She Said)](https://tanialacariastudio.com/collections/voices-thats-what-she)
- [LIVELab 10th Anniversary: Double Pendulum – Synaptic Rodeo](https://livelab.mcmaster.ca/events/livelab-10th-anniversary-double-pendulum-synaptic-rodeo/)
- [LIVELab 10th Anniversary: John Ellison – Some Kind of Wonderful](https://livelab.mcmaster.ca/events/livelab-10th-anniversary-john-ellison-some-kind-of-wonderful/)
- [LIVELab 10th Anniversary: Santee Smith and Kaha:wi Dance Theatre – Continuance Immersive Commemoration (Continuance)](https://livelab.mcmaster.ca/events/livelab-10th-anniversary-santee-smith-and-kahawi-dance-theatre-continuance-immersive-commemoration/)
- [Canadian federal leaders' debate](https://www.cbc.ca/news/canada/hamilton/mcmaster-undecided-voters-study-1.7512327)
