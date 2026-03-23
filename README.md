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

1. A [Bangle.js 2](https://banglejs.com) smartwatch application that records timestamped heart rate and raw PPG sensor data at \~25 Hz. Accelerometer data can optionally be collected at 12.5--50+ Hz. Brief survey questions with numeric/slider responses and be configured and sent in real time to devices while recording.
2. A node.js (local) web application that connects to multiple Bangle.js 2 watches via Bluetooth. This app allows for remote monitoring, starting/stopping records, time synchronization, and large file transfers.

## Setup

This system was developed and tested (so far) on M1/M3 MacBook Pros.

> [!NOTE]
> Testing required:
>
> - [ ] Docker
> - [ ] Virtual machines
> - [ ] MacOS
>   - [X] 14 Sonoma (M1/M3)
>   - [X] 15 Sequoia (M1/M3)
>   - [X] 26 Tahoe (M1/M3)
> - [ ] Linux
> - [ ] Windows
>   - [x] 11 - **not currently supported!**[^windows]

[^windows]: BT device and driver setup is not straightforward. Potential alternative node packages: <https://github.com/stoprocent/noble>; <https://github.com/thegecko/webbluetooth>

### 1. Setting up the Bangle.js 2 watches

See [Watch documentation](src/bangle/README.md).

### 2. Setting up the multi-watch monitoring dashboard

See [Dashboard documentation](/src/dashboard/README.md).

### 3. Analysing data

See [Analysis documentation and tutorial](/src/analysis/README.md).

The analysis code uses our python module for preprocessing watch data here: [beatwatch_process](https://github.com/beatlab-mcmaster/beatwatch_process).

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
- Blue Jays World Series 'Watch' Parties
- LIVELab Hybrid Concert Series: Darcy Hepner and Nancy Walker: An evening of jazz, measured in real time
- Dynamics of Applause

## License

BEATMonitor - Multi-person photoplethysmography using open-source smartwatch technology

Copyright (C) 2026 BEAT Lab

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

## Citation

[![DOI](https://zenodo.org/badge/854785604.svg)](https://doi.org/10.5281/zenodo.15297806)

This repository contains a [CITATION.cff](/CITATION.cff) file.
If you use this project, please cite it using the information in the file or use the "Cite this repository" button on GitHub for citation info.
