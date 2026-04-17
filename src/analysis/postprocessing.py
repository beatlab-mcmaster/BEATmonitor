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

import holoviews as hv  # noqa: F401 -- TODO: tmp
import hvplot.pandas  # noqa: F401 -- Pandas & holoviews
import pandas as pd  # Data handling
import pytz  # Timezone tools

# Import beatwatch processing tools
from beatwatch_process.parsers import Parser, summarise_metadata
from beatwatch_process.process import upsample
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
arg_parse.add_argument(
    "--save",
    type=str,
    default="combined",
    help="Save processed dataframes as 'individual' files, or one 'combined' file (default: 'combined')",
)
args = arg_parse.parse_args()

################## Setup and configuration ####################################

## Read configuration file with load_config from beatwatch_process.utils
cfg = load_config(args.config)
hz = round(1000 / cfg["rate_downsample"])  # TODO: add to beatwatch:utils

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

for k, v in data.items():
    for df_name in ["hr", "accel"]:
        if f"data_{df_name}" in v:
            print(f"Processing {df_name} dataframe [{k}]")
            # Pad selection to nearest second before first sample # TODO: add to beatwath_process
            start = v[f"data_{df_name}"]["time_absolute"].min().floor("s")
            # Resample  data
            v[f"data_{df_name}"] = upsample(
                v[f"data_{df_name}"],
                time_start=start,
                output_rate=cfg["rate_downsample"],
                max_gap=cfg[f"max_gap_{df_name}"],
            )

################## Save processed data #########################################

if args.save == "individual":
    print(
        f"Saving processed data to '{cfg['paths_out']['__cache']}' as individual files."
    )
    for k, v in data.items():
        for df_name in ["hr", "accel"]:
            if f"data_{df_name}" in v:
                v[f"data_{df_name}"].to_parquet(
                    cfg["paths_out"]["__cache"]
                    / f"{k.strip('.csv')}_{df_name}_{hz}Hz.parquet"
                )
else:
    print(f"Saving processed data to '{cfg['paths_out']['__cache']}' as combined file.")
    for df_name in ["hr", "accel"]:
        combined_df = pd.DataFrame()
        for k, v in data.items():
            if f"data_{df_name}" in v:
                # Get watch name
                watch_name = re.search(r"(W.*)\..*$", k).group(1)
                # Add name to dataframe
                v[f"data_{df_name}"]["watch"] = watch_name
                v[f"data_{df_name}"]["watch"] = v[f"data_{df_name}"]["watch"].astype(
                    "category"
                )  # FIX: Set type when concat
                # Create single dataframe
                combined_df = pd.concat([combined_df, v[f"data_{df_name}"]])
        # Write
        combined_df["watch"] = combined_df["watch"].astype("category")
        if not combined_df.empty:
            combined_df.to_parquet(
                cfg["paths_out"]["__cache"] / f"data_{df_name}_full_{hz}Hz.parquet"
            )
