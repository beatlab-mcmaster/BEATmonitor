import yaml
import os
import sys
import re
import logging
from flatten_dict import flatten


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("analysis.log"),
        logging.StreamHandler(),  # Also logs to console
    ],
)


def print_env_info():
    """Print information about the current environment"""
    logging.info("Python environment information:")
    logging.info(f" - Executable: {sys.executable}")
    logging.info(f" - Version: {sys.version}")
    logging.info(f" - Working directory: {os.getcwd()}")


def load_config(file_name):
    """Load the specified configuration file for script"""
    with open(file_name, "r") as file:
        dat = yaml.safe_load(file)
        logging.info(
            f"Analyses will be run with the settings in '{file_name}':\n\n{yaml.dump(dat)}",
        )
        return dat


def init_directories(config_dat):
    """Create project directories based on configuration file"""
    # TODO: error handling
    logging.info("Initializing directories:")
    for d in flatten(config_dat["directories"]).values():
        if re.search("raw", d) is None:  # skip the 'raw' directory
            # TODO: safer method?
            logging.info(f" - Creating directory: {d}")
            os.makedirs(d, exist_ok=True)
