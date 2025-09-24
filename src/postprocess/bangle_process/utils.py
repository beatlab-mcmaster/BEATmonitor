import yaml
import os
import sys
import re
import logging
from flatten_dict import flatten


# --- ANSI color codes ---
RESET = "\x1b[0m"
COLORS = {
    logging.DEBUG: "\x1b[38;20m",  # grey
    logging.INFO: "\x1b[37;20m",  # white
    logging.WARNING: "\x1b[33;20m",  # yellow
    logging.ERROR: "\x1b[31;20m",  # red
    logging.CRITICAL: "\x1b[31;1m",  # bold red
}


class ColorFormatter(logging.Formatter):
    def format(self, record):
        log_fmt = f"{COLORS.get(record.levelno, RESET)}%(asctime)s [%(levelname)s] %(message)s{RESET}"
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)


# --- Handlers ---
file_handler = logging.FileHandler("analysis.log")
file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))

console_handler = logging.StreamHandler()
console_handler.setFormatter(ColorFormatter())

# --- Logger setup ---
logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler],
)

logger = logging.getLogger(__name__)


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


def check_existing(file_name):
    """Check for existing file"""
    is_found = False
    if os.path.isfile(file_name):
        logging.info(f" - {file_name} already exists, skipping processing")
        is_found = True
    else:
        logging.info(f" - {file_name} does not exist, processing...")
    return is_found
