import os
import re
import pandas as pd
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("processing.log"),
        # logging.StreamHandler(),  # Also logs to console
    ],
)

tz = None


def get_study_file_list(data_dir, match_criteria=r".*\.csv"):
    """Return a sorted list of files matching specified criteria"""
    files = [i for i in os.listdir(data_dir) if re.match(match_criteria, i)]
    return sorted(files)


def check_file(file_name):
    """
    Parse a recording file and return a one-row DataFrame with:
    - Watch ID
    - File name
    - MAC address
    - Start and end timestamps (timezone-aware)
    - Duration
    - Number of samples
    """
    logging.info(f"Checking file: {file_name}")

    samples = 0
    watch_id = "Unknown"
    mac_addr = "Unknown"
    t_start = t_end = pd.NaT

    # Precompile regexes
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
                        logging.warning(f"MAC address not found in: {file_name}")

                    if watch_match := watch_re.search(line):
                        watch_id = watch_match.group(0)
                    else:
                        logging.warning(f"Watch ID not found in: {file_name}")

                elif i == 1:
                    if ts_match := timestamp_re.search(line):
                        try:
                            t_start = pd.to_datetime(
                                ts_match.group(1), utc=True
                            ).tz_convert(tz)
                        except Exception as e:
                            logging.warning(
                                f"Invalid start timestamp in {file_name}: {e}"
                            )
                    else:
                        logging.warning(f"Start timestamp missing in: {file_name}")

                elif stop_re.search(line):
                    if ts_match := timestamp_re.search(line):
                        try:
                            t_end = pd.to_datetime(
                                ts_match.group(1), utc=True
                            ).tz_convert(tz)
                        except Exception as e:
                            logging.warning(
                                f"Invalid end timestamp in {file_name}: {e}"
                            )
                    else:
                        logging.warning(
                            f"End timestamp missing after STOP_RECORD in: {file_name}"
                        )

                else:
                    samples += 1

    except FileNotFoundError:
        logging.error(f"File not found: {file_name}")
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

    logging.info(f"Reading {len(file_dir)} files in: {file_dir}")

    df = pd.DataFrame({})

    for d in get_study_file_list(file_dir):
        df_file_summary = check_file(file_dir + d)
        df = pd.concat([df, df_file_summary])
    df = df.set_index("Watch", inplace=False).sort_index()

    df.to_csv(summary_dir + "files_watch_summary.csv")
    logging.info(f"Summary file saved to: {summary_dir}files_watch_summary.csv")

    return df


def get_file_summary(
    file_name,
    column_names=["timeFromStart", "heartRate", "confidence", "ppgRaw", "ppgFilter"],
):
    """Return a dataframe summarising a single file
    Note: Some pilot studies have different column names
    """
    logging.info(f">>>>>> {file_name}")
    check = check_file(file_name)

    if check.Samples[0] > 1:
        try:
            time_started = check.RecordStart[0]
        except Exception as e:
            time_started = pd.NaT
            logging.warning(f"Did not find start time! [error: {e}]")

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
        df = pd.DataFrame({})

    return df


def flag_records(df, config_dat):
    """Flag records outside of minimum length and contain minimum
    number of samples
    """
    seconds = config_dat["access_data"]["minimum_record_length"]
    min_length = pd.to_timedelta(seconds, unit="s")
    min_sample_rate = config_dat["access_data"]["minimum_sample_rate"]
    logging.info(
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
    logging.info(f"Flagged {len(df_flagged)} records")
    return df_flagged


def get_raw_watch_data(df_check, config_dat, save_data=False):
    """Read raw watch data listed as files in df_check"""
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
        df_tmp = get_file_summary(f)
        if not (df_tmp.empty):
            # df_tmp.set_index(["watchId", "time"], inplace=True)
            df_out = pd.concat([df_out, df_tmp])
    if save_data:
        df_out.to_parquet(df_dir_out + "raw_data_full.parquet")
    return df_out


def trim_raw_watch_data(df, config_dat, save_data=False):
    df_dir_out = config_dat["directories"]["data"]["processed"]
    # Get start/end timestamps
    period_start = pd.to_datetime(config_dat["access_data"]["trim_data_before"])
    period_end = pd.to_datetime(config_dat["access_data"]["trim_data_after"])
    logging.info(f"Trimming raw data from: {period_start} -- {period_end}")
    df = df[(df["time"] > period_start) & (df["time"] < period_end)]
    if save_data:
        df.to_parquet(df_dir_out + "raw_data_trimmed.parquet")
    return df
