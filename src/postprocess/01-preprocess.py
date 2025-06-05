import typer
from bangle_process import data_access, utils, reporting, pipelines


def main(force_all: bool = False, config: str = "config.yml", logging: str = "info"):
    """Complete script to preprocess data from Bangle.js watches.
    Analysis settings are read from a configuration file;
    summary of watch files and flagged data are saved as CSV
    files; raw data are read, resampled, and saved as parquet
    files; PPG peaks are detected and saved as a parquet file."""

    utils.print_env_info()

    if force_all:
        # TODO : Add force option
        print("Forcing reprocessing of all data.")

    # Load our configuration file
    cfg = utils.load_config(config, print_config=True)

    # Initialize directories
    utils.init_directories(cfg)

    # Preprocess Data
    ## Read raw data
    files_watch_summary = data_access.summarise_files_in_directory(cfg)

    ## Flag unusual records (based on config settings)
    flagged_data = data_access.flag_records(files_watch_summary, cfg)
    files_watch_summary.drop(list(flagged_data.index), inplace=True)

    ## Read all raw data from the watches
    raw_data_full = data_access.get_raw_watch_data(
        files_watch_summary, cfg, save_data=True
    )

    ## Trim to length of event
    raw_data_trimmed = data_access.trim_raw_watch_data(
        raw_data_full, cfg, save_data=True
    )

    if force_all:
        print(
            "Forcing Visualization of all data."
        )  # TODO: Add force option to functions
        # Visualization
        reporting.plotly_data(raw_data_trimmed, cfg)

        # Plot heartRate by default
        reporting.plot_raw_individual_watches(raw_data_trimmed, cfg)

        # Plot ppgRaw
        reporting.plot_raw_individual_watches(raw_data_trimmed, cfg, value="ppgRaw")

    # PPG
    ## Resample PPG data and save to file
    pipelines.resample_PPG(raw_data_trimmed, cfg, save_data=True)
    ## Find PPG peaks and save to file
    pipelines.PPG_find_peaks(raw_data_trimmed, cfg, save_data=True)


if __name__ == "__main__":
    typer.run(main)
