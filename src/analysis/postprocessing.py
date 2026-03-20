#!/usr/bin/env python3
"""
File: postprocessing_example.py
Author: Maya B. Flannery
Date: 2026-03-18
Description: This script uses the beatwatch_process module to parse and clean
    data collected on Bangle.js 2 smartwatches using the BEATwatch application.
Usage::
    From the command line:
        uv run postprocessing_example.py
        uv run postprocessing_example.py --config <file_name.yml>
"""

import argparse  # Handle command line arguments
import re  # Text search tools
from pathlib import Path  # noqa: F401 -- Path syntax

import hvplot.pandas  # noqa: F401 -- Pandas + holoviews
import pandas as pd  # Data handling
import pytz  # Timezone tools

# Import beatwatch processing tools
from beatwatch_process.parsers import Parser, summarise_metadata
from beatwatch_process.utils import get_valid_watch_files, load_config

################## Handle command line arguments ##############################

arg_parse = argparse.ArgumentParser(
    prog="Preprocess HR/Accel",
    description="Preprocessing script for heart rate and acceleration data.",
    epilog="",
)
arg_parse.add_argument(
    "--config",
    type=str,
    default="default.yml",
    help="Specify configuration file (default: 'default.yml')",
)
args = arg_parse.parse_args()

################## Setup and configuration ####################################

## Read configuration file with load_config from beatwatch_process.utils
cfg = load_config(args.config)

# TODO: timezone operations should be handled by beatwatch_process module
tz = pytz.timezone(cfg["timezone"])  # Initialize timezone

parser = Parser(cfg["timezone"])

################## Read and parse data ########################################

## Search for valid files
f_data = get_valid_watch_files(cfg["paths_in"]["raw"])

## Read and parse files
data = {}
for f in f_data:
    data[f] = parser.parse_file(cfg["paths_in"]["raw"] / f)

## Summarise parsed data
metadata = summarise_metadata(data)
metadata.to_csv(cfg["paths_out"]["summary"] / "parsed_metadata.csv")


################## Process raw data ###########################################


################## Save processed data #########################################

sample_rate = cfg["rate_downsample"]
frequency = round(1000 / sample_rate)
ft = cfg["output_file_type"]

# Write individual parsed data files
if cfg["output_individual_files"]:
    for k, v in data.items():
        (
            v["data_hr"][::sample_rate]  # Filter samples
            .drop(columns=["time_elapsed"])  # Drop unused columns
            .to_parquet(
                cfg["output_path"]
                + f"processed/heart_rate/{k.strip('.csv')}_{frequency}Hz.{ft}"
            )
        )
        (
            v["data_accel"][::sample_rate]  # Filter samples
            .drop(columns=["time_elapsed"])  # Drop columns
            .to_parquet(
                cfg["output_path"]
                + f"processed/acceleration/{k.strip('.csv')}_{frequency}Hz.{ft}"
            )
        )


# Write single parsed data file
if cfg["output_combined_files"]:
    data_accel = pd.DataFrame()
    data_hr = pd.DataFrame()

    for k, v in data.items():
        # Get watch name
        watch_name = re.search(r"(W.*)\..*$", f).group(1)
        # Add name to hr dataframe
        v["data_hr"]["watch"] = watch_name
        v["data_hr"]["watch"] = v["data_hr"]["watch"].astype("category")
        # Add name to accel dataframe
        v["data_accel"]["watch"] = watch_name
        v["data_accel"]["watch"] = v["data_accel"]["watch"].astype("category")
        # Create single hr, accel dataframes
        data_hr = pd.concat(
            [
                data_hr,
                v["data_hr"][::sample_rate].drop(columns=["time_elapsed"]),
            ]
        )
        data_accel = pd.concat(
            [
                data_accel,
                v["data_accel"][::sample_rate].drop(columns=["time_elapsed"]),
            ]
        )

    data_hr.to_parquet(
        cfg["output_path"]
        + f"processed/heart_rate/combined_hr_watches_{frequency}Hz.{ft}"
    )
    data_accel.to_parquet(
        cfg["output_path"]
        + f"processed/acceleration/combined_accel_watches_{frequency}Hz.{ft}"
    )
