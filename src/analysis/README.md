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

In the Terminal, run the following commands

- Note: on Windows, open the 'Anaconda prompt' to run the initialization.

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

Follow the instructions in the notebook: `postprocessing_template.ipynb`

- Note: the notebook is located in the `src/postprocess/scripts/` folder of this repository.

## Resources

### Coding

Guide to convert [Jupyter notebooks to Python](https://linuxhaxor.net/code/convert-jupyter-notebook-python.html)
Guide to [Python project setup](https://goodresearch.dev/setup)

## Dependencies

### From history

`conda env export --from-history`

```yaml
name: bangle_post_processing
channels:
  - conda-forge
  - defaults
dependencies:
  - dask=2024.12.1
  - datashader=0.16.3
  - flatten-dict=0.4.2
  - jupyterlab=4.3.4
  - neurokit2=0.2.10
  - pandas=2.2.2
  - plotly=5.24.1
  - pyarrow=18.1.0
  - python-kaleido=0.2.1
  - python=3.11.0
  - pytz=2024.2
  - pyyaml=6.0.2
  - xarray=2025.1.1
  - holoviews
  - selenium
```
