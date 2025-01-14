# Bangle.js 2 Postprocessing

## Overview

This code and tutorial contain functions for postprocessing data collected using the BEATwatch application.

Prior to running these scripts, data must be transferred from the watches using the BEATmonitor dashboard.
All watch files should be saved in a single directory (do not rename files).
The example postprocessing template/tutorial provides a step by step walk through on how to prepare data for final analyses.

## Installation

We have set up a python environment for running this process.
If you do not have Conda installed, following the installation instructions.
Otherwise, navigate to the `postprocess` folder in this repository and run the command in **Initialize environment**.

### Install Conda

See [instructions](https://docs.anaconda.com/miniconda/install/#installing-miniconda) to install.

### Initialize environment

```bash
conda env create -f environment.yml
```

For reference:

- [Creating an environment](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html#creating-an-environment-from-an-environment-yml-file)
- [Saving an environment](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html#exporting-the-environment-yml-file)

### Activate environment

```bash
conda activate bangle_post_processing
```

## Template example/tutorial

Once the environment is activated, the tutorial script can be run in Jupyter Lab:

```bash
jupyter lab
```

Jupyter should open up in your web browser.
Follow the script there.

## Resources

### Coding

Guide to convert [Jupyter notebooks to Python](https://linuxhaxor.net/code/convert-jupyter-notebook-python.html)
Guide to [Python project setup](https://goodresearch.dev/setup)
