import os  # Operating system tools
import argparse  # Handle command line arguments
import re  # Text search tools
import pytz  # Timezone tools

import pandas as pd  # Data handling

# Import beatwatch processing tools
from beatwatch_process.parsers import Parser, summarise_metadata
from beatwatch_process.utils import load_config, get_valid_watch_files
from beatwatch_process.process import upsample

# Handle command line arguments
arg_parse = argparse.ArgumentParser(
    prog="Preprocess HR/Accel",
    description="Preprocessing script for heart rate and acceleration data.",
    epilog="",
)
arg_parse.add_argument(
    "--config",
    type=str,
    default="default.yml",
    help="Specify configuration file (default: 'default.yml'",
)
args = arg_parse.parse_args()

# Read configuration file
cfg = load_config(args.config)
# Create subdirectories
subdirs = ["", "processed/", "processed/heart_rate/", "processed/acceleration/"]
for dir in subdirs:
    os.makedirs(cfg["output_path"] + dir, exist_ok=True)

# TODO: timezone operations should be handled by beatwatch module
tz = pytz.timezone(cfg["timezone"])  # Initialize timezone

parser = Parser(cfg["timezone"])

## Read data -- Search for valid files
f_data = get_valid_watch_files(cfg["data_path"])

## Read data -- parse files
data = {}
for f in f_data:
    data[f] = parser.parse_file(cfg["data_path"] + f)
    data[f]["data_hr"].set_index("time_absolute", inplace=True)
    data[f]["data_accel"].set_index("time_absolute", inplace=True)

## Summarise parsed data
metadata = summarise_metadata(data)
metadata.to_csv(cfg["output_path"] + "parsed_metadata.csv")

## Compute sample differences
for k, v in data.items():
    v["data_hr"]["diff"] = v["data_hr"].index.diff().total_seconds() * 1000
    v["data_accel"]["diff"] = v["data_accel"].index.diff().total_seconds() * 1000

## Label gaps
for k, v in data.items():
    v["data_hr"]["gap"] = v["data_hr"]["diff"] >= cfg["max_gap_hr"]
    v["data_accel"]["gap"] = v["data_accel"]["diff"] >= cfg["max_gap_accel"]

## Upsample data
for k, v in data.items():
    v["data_hr"] = upsample(
        v["data_hr"], cfg["max_gap_hr"], upsample_rate=cfg["rate_upsample"]
    )
    v["data_accel"] = upsample(
        v["data_accel"], cfg["max_gap_accel"], upsample_rate=cfg["rate_upsample"]
    )


################## Save processed data ########################################


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
