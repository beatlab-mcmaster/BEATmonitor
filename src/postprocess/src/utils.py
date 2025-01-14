import yaml
import os
import re
import pytz
from flatten_dict import flatten


def load_config(file_name, print_config=False):
    """Load the specified configuration file for script"""
    with open(file_name, "r") as file:
        dat = yaml.safe_load(file)
        dat["timezone"] = pytz.timezone(dat["timezone"])
        if print_config:
            print("Analyses will be run with the following settings:")
            print(yaml.dump(dat))
        return dat


def init_directories(config_dat):
    """Create project directories based on configuration file"""
    # TODO: error handling
    for d in flatten(config_dat["directories"]).values():
        if re.search("raw", d) is None:  # skip the 'raw' directory
            # TODO: safer method?
            print("Creating directory: ", d)
            os.makedirs(d, exist_ok=True)
