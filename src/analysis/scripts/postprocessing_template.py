#!/usr/bin/env python
# coding: utf-8

# # Postprocessing Template (Tutorial)
#
# Before running this script, extract the example data into the `data/raw`
# folder in the analysis directory of this repository.


import sys

sys.path.append("..")  # Allow imports from project directory

# Load postprocessing modules
from bangle_process import data_access, pipelines, reporting, utils

print(sys.executable)  # Verify conda environment is active
print(sys.version)


# ## Configuration
#
# Configuration variables are set in the file: `config.yml`.
#
# Here, the processed data and results will be output into the
# `template_example` folder.


cfg = utils.load_config("config.yml", print_config=True)


# ## Initialize directories
#
# Ensure each folder is created to store the processed data and results.


utils.init_directories(cfg)


# ## Summarize raw data files in directory
#
# First we can check for the valid files in the raw data directory
#
# Files containing raw watch data (in the configured directory) are read and
# stored in a dataframe.
#
# We can then manually inspect each watch's `RecordStart` and `RecordFinish`
# time, its `Duration`, and the number of `Samples` collected.
#
# The file information is also exported to a `.csv` file in the
# `../template_example/results/summary/` folder.


files_watch_summary = data_access.summarise_files_in_directory(cfg)
print(files_watch_summary)


# We can automatically flag any records that are not within our configured
# length or sample rate.


flagged_data = data_access.flag_records(files_watch_summary, cfg)


# In this example, the following watch is flagged:


print(flagged_data)


# Now we can exclude this record from the watch file summary


files_watch_summary.drop(list(flagged_data.index), inplace=True)
print(files_watch_summary)


# ## Read raw data
#
# Now all of the raw data that meet our criteria can be read and combined into
# a single dataframe.


raw_data_full = data_access.get_raw_watch_data(files_watch_summary, cfg, save_data=True)


raw_data_full.head()


# ### Trim raw data to time period
#
# Optionally, data outside of a specified time window can be removed from the
# dataframe.
#
# This time range can be specified in the config file.
#
# For example, you likely want to trim to a global start time and end time of
# data collection.


raw_data_trimmed = data_access.trim_raw_watch_data(raw_data_full, cfg, save_data=True)


print(raw_data_trimmed)


# ## Visualization


reporting.plotly_data(raw_data_trimmed, cfg)


# Plot heartRate by default
reporting.plot_raw_individual_watches(raw_data_trimmed, cfg)


# Plot ppgRaw
reporting.plot_raw_individual_watches(raw_data_trimmed, cfg, value="ppgRaw")


# ## Heart rate processing

# ### Resampling
# The raw data must be resampled at a constant rate for all watches.


resampled_data_HR_1000ms = pipelines.resample_HR(raw_data_trimmed, cfg, save_data=True)


resampled_data_HR_1000ms.reset_index("time", inplace=True)


reporting.plotly_data(resampled_data_HR_1000ms, cfg)
