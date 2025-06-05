import yaml
import os
import sys
import re
import pytz
from flatten_dict import flatten


def print_env_info():
    """Print information about the current environment"""
    print(
        f"Python executable:\n>> {sys.executable}"
    )  # Verify conda environment is active
    print(f"Python version:\n>> {sys.version}")
    print(f"Current working directory:\n>> {os.getcwd()}")


def load_config(file_name, print_config=False):
    """Load the specified configuration file for script"""
    with open(file_name, "r") as file:
        dat = yaml.safe_load(file)
        if print_config:
            print(
                f"Analyses will be run with the following settings in '{file_name}':\n"
            )
            print(yaml.dump(dat))
        dat["timezone"] = pytz.timezone(dat["timezone"])
        return dat


def init_directories(config_dat):
    """Create project directories based on configuration file"""
    # TODO: error handling
    for d in flatten(config_dat["directories"]).values():
        if re.search("raw", d) is None:  # skip the 'raw' directory
            # TODO: safer method?
            print("Creating directory: ", d)
            os.makedirs(d, exist_ok=True)
