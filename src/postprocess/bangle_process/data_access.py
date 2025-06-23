import os
import re
import pytz
import pandas as pd
from . import utils


def get_study_file_list(data_dir, match_criteria=r".+\.(csv|hr)$"):
    """Return a sorted list of files matching specified criteria"""
    match_criteria = re.compile(match_criteria, re.IGNORECASE)
    files = [i for i in os.listdir(data_dir) if match_criteria.fullmatch(i)]
    return sorted(files)


def check_file(file_name, config_dat):
    """
    Parse a recording file and return a one-row DataFrame with:
    - Watch ID
    - File name
    - MAC address
    - Start and end timestamps (timezone-aware)
    - Duration
    - Number of samples
    """
    utils.logging.info(f" - Checking file: {file_name}")
    tz = pytz.timezone(config_dat["timezone"])

    samples = 0
    watch_id = "Unknown"
    mac_addr = "Unknown"
    t_start = t_end = pd.NaT

    # Precompile regexes
    # TODO: read these lines a json object instead of regex
    mac_re = re.compile(r'(?<="MAC":")(..:..:..:..:..:..)(")')
    watch_re = re.compile(r"W...")
    timestamp_re = re.compile(r'(?<="UNIXTimeStamp":")(.*?)(",")')
    stop_re = re.compile("STOP_RECORD")

    try:
        with open(file_name, encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i == 0:
                    if mac_match := mac_re.search(line):
                        mac_addr = mac_match.group(1)
                    else:
                        utils.logging.warning(f"MAC address not found in: {file_name}")

                    if watch_match := watch_re.search(line):
                        watch_id = watch_match.group(0)
                    else:
                        utils.logging.warning(f"Watch ID not found in: {file_name}")

                elif i == 1:
                    if ts_match := timestamp_re.search(line):
                        try:
                            t_start = pd.to_datetime(
                                ts_match.group(1), utc=True
                            ).tz_convert(tz)
                        except Exception as e:
                            utils.logging.warning(
                                f"Invalid start timestamp in {file_name}: {e}"
                            )
                    else:
                        utils.logging.warning(
                            f"Start timestamp missing in: {file_name}"
                        )

                elif stop_re.search(line):
                    if ts_match := timestamp_re.search(line):
                        try:
                            t_end = pd.to_datetime(
                                ts_match.group(1), utc=True
                            ).tz_convert(tz)
                        except Exception as e:
                            utils.logging.warning(
                                f"Invalid end timestamp in {file_name}: {e}"
                            )
                    else:
                        utils.logging.warning(
                            f"End timestamp missing after STOP_RECORD in: {file_name}"
                        )

                else:
                    samples += 1

    except FileNotFoundError:
        utils.logging.error(f"File not found: {file_name}")
        return pd.DataFrame()

    duration = (
        t_end - t_start
        if all(pd.api.types.is_scalar(x) and pd.notna(x) for x in [t_start, t_end])
        else pd.Timedelta(0)
    )

    return pd.DataFrame(
        [
            {
                "Watch": watch_id,
                "File": file_name,
                "MAC": mac_addr,
                "RecordStart": t_start,
                "RecordFinish": t_end,
                "Duration": duration,
                "Samples": samples,
            }
        ]
    )


def summarise_files_in_directory(config_dat):
    """Get summary information for all watch data files in configured directory
    Return a dataframe with summary of data files in specified directory"""

    file_dir = config_dat["directories"]["data"]["raw"]
    summary_dir = config_dat["directories"]["data"]["summary"]

    valid_files = get_study_file_list(file_dir)

    utils.logging.info(f"Summarising {len(valid_files)} files in directory: {file_dir}")

    df = pd.DataFrame({})

    for d in valid_files:
        df_file_summary = check_file(file_dir + d, config_dat)
        df = pd.concat([df, df_file_summary])
    df = df.set_index("Watch", inplace=False).sort_index()

    df.to_csv(summary_dir + "files_watch_summary.csv")
    utils.logging.info(
        f" >> Summary file saved to: {summary_dir}files_watch_summary.csv"
    )

    return df


def get_file_summary(
    file_name,
    config_dat,
    column_names=["timeFromStart", "heartRate", "confidence", "ppgRaw", "ppgFilter"],
):
    """Return a dataframe summarising a single file
    Note: Some pilot studies have different column names
    """
    check = check_file(file_name, config_dat)

    if check.Samples[0] > 1:
        try:
            time_started = check.RecordStart[0]
        except Exception as e:
            time_started = pd.NaT
            utils.logging.warning(f"Did not find start time! [error: {e}]")

        utils.logging.info(f"   - Getting CSV data: {file_name}")
        df = pd.read_csv(
            file_name,
            header=None,
            names=column_names,
            skiprows=[0, 1],
            on_bad_lines="skip",
        )
        df["watchId"] = check.Watch[0]
        df["heartRate"] = df["heartRate"] / 10
        df["timeDifference"] = df["timeFromStart"].diff()
        df["time"] = time_started + pd.to_timedelta(
            df.loc[:, "timeFromStart"], unit="ms"
        )
    else:
        utils.logging.error("   - Empty file!!!")
        df = pd.DataFrame({})

    return df


def flag_records(df, config_dat):
    """Flag records outside of minimum length and contain minimum
    number of samples
    """
    seconds = config_dat["access_data"]["minimum_record_length"]
    min_length = pd.to_timedelta(seconds, unit="s")
    min_sample_rate = config_dat["access_data"]["minimum_sample_rate"]
    utils.logging.info(
        "Flagging records with: "
        + f"duration less than {seconds} seconds [{seconds/60} mins], "
        + f"or sample rate less than {min_sample_rate} samples/sec.",
    )
    df_flagged = df[
        (df["Duration"] < min_length)  # Record shorter than len (shortest condition)
        | (
            df["Samples"] < min_length.seconds * min_sample_rate
        )  # Low sample rate (missed samples)
    ]
    utils.logging.info(f" - Flagged {len(df_flagged)} records")
    for i, f in df_flagged.iterrows():
        utils.logging.info(f"   - Watch: {i}; File: {f['File']}")
    return df_flagged


def get_raw_watch_data(df_check, config_dat, save_data=False):
    """Read raw watch data listed as files in df_check"""
    utils.logging.info("Reading raw watch data from files:")

    df_dir_out = config_dat["directories"]["data"]["processed"]
    df_out = pd.DataFrame(
        {
            "watchId": [],
            "timeFromStart": [],
            "time": [],
            "heartRate": [],
            "confidence": [],
            "ppgRaw": [],
            "ppgFilter": [],
            "timeDifference": [],
        }
    ).set_index(["watchId", "time"])

    for f in df_check["File"].values:
        df_tmp = get_file_summary(f, config_dat)
        if not (df_tmp.empty):
            # df_tmp.set_index(["watchId", "time"], inplace=True)
            df_out = pd.concat([df_out, df_tmp])
    if save_data:
        df_out.to_parquet(df_dir_out + "raw_data_full.parquet")
    return df_out


def trim_raw_watch_data(df, config_dat, save_data=False):
    tz = pytz.timezone(config_dat["timezone"])
    df_dir_out = config_dat["directories"]["data"]["processed"]

    # Get start/end timestamps
    period_start = tz.localize(
        pd.to_datetime(config_dat["access_data"]["trim_data_before"])
    )
    period_end = tz.localize(
        pd.to_datetime(config_dat["access_data"]["trim_data_after"])
    )

    utils.logging.info("Trimming raw data:")
    utils.logging.info(f" - Using period from: {period_start} -- {period_end}")

    df = df[(df["time"] > period_start) & (df["time"] < period_end)]
    if save_data:
        df.to_parquet(df_dir_out + "raw_data_trimmed.parquet")
    return df


def select_period(df, start_timestamp, end_timestamp, config_dat):
    tz = pytz.timezone(config_dat["timezone"])

    period_start = tz.localize(pd.to_datetime(start_timestamp))
    period_end = tz.localize(pd.to_datetime(end_timestamp))

    utils.logging.info("Selecting time period:")
    utils.logging.info(f" - From: {period_start} -- {period_end}")

    df.reset_index(inplace=True)  # Ensure 'time' is a column
    out = df[(df["time"] > period_start) & (df["time"] < period_end)]
    out.set_index(["watchId", "time"], inplace=True)

    return out
