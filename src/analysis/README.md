# Bangle.js 2 Postprocessing

## Overview

This code and tutorial contain functions for postprocessing data collected using the BEATwatch application.

Prior to running these scripts, data must be transferred from the watches using the BEATmonitor dashboard.
All watch files should be saved in a single directory (do not rename files).
The example postprocessing template/tutorial provides a step by step walk through on how to prepare data for final analyses.

## Installation

We have set up a python environment for running this process. Note: original package management used conda, I recently switched to uv (fast, simple setup).

### Install uv

See [documentation](https://docs.astral.sh/uv/getting-started/installation/) to install.

Example: recommended on Mac (use [brew](https://brew.sh)):

```sh
brew install uv
```

### Initialize environment

In the Terminal, navigate to the analysis directory:

```sh
cd <project root directory>/src/analysis/
```

Then run the following commands:

```sh
uv sync
```

This installs all required dependencies for analysing watch data. Primary packages needed are:

- [beatwatch_process](https://github.com/beatlab-mcmaster/beatwatch_process): module with functions for parsing, cleaning, signal processing of heart rate, acceleration, and survey response data written to Bangle.js smartwatches while recording.
- [jupyter lab](https://jupyter.org/): code notebooks for developing analyses. The tutorial examples are provided in this format.
- [holoviews](https://holoviews.org/): visualisation library for interactive plotting.

### Activate environment

The environment is activated whenever `uv` is used to run commands. For example:

To run python:

```sh
uv run python
```

To run jupyter lab:

```sh
uv run jupyter lab
```

To run a script:

```sh
uv run postprocessing_example.py
```

## Template tutorial

Once the environment is synchronized, you can step through an example tutorial script in Jupyter Lab.
First launch Jupyter Lab by running the following command in the terminal:

```sh
uv run jupyter lab
```

Jupyter should open up in your web browser.

Follow the instructions in the notebook: `postprocessing_example.ipynb`

## Resources

### Coding

Guide to convert [Jupyter notebooks to Python](https://linuxhaxor.net/code/convert-jupyter-notebook-python.html)

Guide to [Python project setup](https://goodresearch.dev/setup)
