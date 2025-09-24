import os
import re
import csv
import json
import pytz
import pandas as pd
from . import utils


def write_dataframe(df, file_name, config_dat) -> None:
    """Write data frame to disk storage as configured file type (default file
    type is .parquet"""
    extension_pattern = re.compile(r"\.[^\.]*$")  # Find file extension
    if config_dat["access_data"]["storage_file_type"] == "csv":
        file_name = re.sub(extension_pattern, ".csv", file_name)
        utils.logging.info(f"Writing data as csv to: {file_name}")
        df.to_csv(file_name)
    else:
        file_name = re.sub(extension_pattern, ".parquet", file_name)
        utils.logging.info(f"Writing data as parquet to: {file_name}")
        df.to_parquet(file_name)


def read_dataframe(file_name, config_dat) -> pd.DataFrame:
    """Read data frame from disk storage as configured file type (default file
    type is .parquet"""
    extension_pattern = re.compile(r"\.[^\.]*$")  # Find file extension
    if config_dat["access_data"]["storage_file_type"] == "csv":
        file_name = re.sub(extension_pattern, ".csv", file_name)
        utils.logging.info(f"Reading csv from: {file_name}")
        df_out = pd.read_csv(file_name)
    else:
        file_name = re.sub(extension_pattern, ".parquet", file_name)
        utils.logging.info(f"Reading parquet from: {file_name}")
        df_out = pd.read_parquet(file_name)
    return df_out


def get_study_file_list(data_dir, match_criteria=r".+\.(csv|hr)$"):
    """Return a sorted list of files matching specified criteria"""
    utils.logging.info(f" - Searching directory for valid records: {data_dir}")
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

    samples_hr = 0
    samples_accel = 0
    timeElapsed = 0
    watch_id = "Unknown"
    mac_addr = "Unknown"
    t_start = t_end = pd.NaT

    # Precompile regexes
    stop_re = re.compile("STOP_RECORD")

    try:
        with open(file_name, encoding="utf-8") as f:
            end_ts_found = False
            meta_file = None
            meta_record_start = None
            meta_record_end = None
            previous_line = ""
            for i, line in enumerate(f):
                previous_line = line
                if i == 0:  # Read file metadata
                    try:
                        meta_file = json.loads(line)
                    except json.decoder.JSONDecodeError as e:
                        utils.logging.error(
                            f"Bad file metadata: line {i} in {file_name}\n-- {e}"
                        )
                    else:
                        mac_addr = meta_file["File"]["MAC"]
                        watch_id = meta_file["File"]["PhysicalID"]

                elif i == 1:  # Read record metadata
                    try:
                        meta_record_start = json.loads(line)
                    except json.decoder.JSONDecodeError as e:
                        utils.logging.critical(
                            f"Bad record metadata: line {i} in {file_name}\n-- {e}"
                        )
                    else:
                        try:
                            t_start = pd.to_datetime(
                                meta_record_start["Record"]["UNIXTimeStamp"], utc=True
                            ).tz_convert(tz)
                        except Exception as e:
                            utils.logging.critical(
                                f"Invalid start timestamp in record metadata: line {i} in {file_name}\n-- {e}"
                            )

                elif stop_re.search(line):  # Read record stop metadata
                    try:
                        meta_record_end = json.loads(line)
                    except json.decoder.JSONDecodeError as e:
                        utils.logging.error(
                            f"Bad record metadata: line {i} in {file_name}\n-- {e}"
                        )
                    else:
                        try:
                            t_end = pd.to_datetime(
                                meta_record_end["Record"]["UNIXTimeStamp"], utc=True
                            ).tz_convert(tz)
                        except Exception as e:
                            utils.logging.error(
                                f"Invalid stop timestamp in record metadata: line {i} in {file_name}\n-- {e}"
                            )
                        else:
                            end_ts_found = True

                else:
                    if re.search(r"^(A)(\d*),", line):
                        samples_accel += 1
                    else:
                        samples_hr += 1

            if not end_ts_found:
                if previous_line:
                    try:
                        timeElapsed = int(
                            re.match(r"^(?P<accel>A?)(?P<elapsed>\d*),", previous_line)[
                                "elapsed"
                            ]  # type: ignore
                        )
                    except BaseException as e:
                        utils.logging.error(
                            f"Could not find elapsed time in file {file_name}\n-- {e}"
                        )
                utils.logging.warning(f"End timestamp missing in: {file_name}!")

    except FileNotFoundError:
        utils.logging.error(f"File not found: {file_name}")
        return pd.DataFrame()

    duration = (
        t_end - t_start
        if all(pd.api.types.is_scalar(x) and pd.notna(x) for x in [t_start, t_end])
        else pd.Timedelta(timeElapsed, unit="ms")
    )

    df_out = pd.DataFrame(
        [
            {
                "Watch": watch_id,
                "File": file_name,
                "MAC": mac_addr,
                "RecordStart": t_start,
                "RecordFinish": t_end,
                "Duration": duration,
                "Samples_hr": samples_hr,
                "Samples_accel": samples_accel,
            }
        ]
    )

    return df_out


def summarise_files_in_directory(config_dat, save_data=True, force_processing=True):
    """Get summary information for all watch data files in configured directory
    Return a dataframe with summary of data files in specified directory"""

    file_name = config_dat["directories"]["data"]["summary"] + "files_watch_summary.csv"

    if force_processing or not utils.check_existing(file_name):
        file_dir = config_dat["directories"]["data"]["raw"]
        valid_files = get_study_file_list(file_dir)
        utils.logging.info(
            f"Summarising {len(valid_files)} files in directory: {file_dir}"
        )

        df_out = pd.DataFrame({})

        for d in valid_files:
            df_file_summary = check_file(file_dir + d, config_dat)
            df_out = pd.concat([df_out, df_file_summary])
        df_out = df_out.set_index("Watch", inplace=False).sort_index()

        if save_data:
            df_out.to_csv(file_name)
            utils.logging.info(
                f" >> Summary file saved to: {file_name}files_watch_summary.csv"
            )
    else:
        df_out = pd.read_csv(
            file_name,
            index_col="Watch",
            parse_dates=["RecordStart", "RecordFinish"],  # datetime columns
            converters={"Duration": lambda x: pd.to_timedelta(x)},  # timedelta column
        )

    return df_out


def get_file(
    file_name,
    config_dat,
    column_names=["timeFromStart", "heartRate", "confidence", "ppgRaw", "ppgFilter"],
):
    """Return a dataframe summarising a single file
    Note: Some pilot studies have different column names
    """
    check = check_file(file_name, config_dat)
    df_out = None

    def _read_hr_data():
        """This is the original code to parse HR data files."""
        if check.filter(regex=r"^Samples_hr").ge(2).all(axis=0).any():  # type: ignore
            try:
                time_started = check.RecordStart[0]
            except Exception as e:
                time_started = pd.NaT
                utils.logging.error(f"Did not find start time! [error: {e}]")

            utils.logging.info(f"   - Getting CSV data: {file_name}")
            df = pd.read_csv(
                file_name,
                header=None,
                names=column_names,
                skiprows=[0, 1],
                on_bad_lines="skip",
            )
            # TODO: different types/column numbers.....
            df["watchId"] = check.Watch[0]
            # df["watchId"] = df["watchId"].astype("category")
            df["heartRate"] = df["heartRate"] / 10
            df["heartRate"] = df["heartRate"].astype("int")
            df["timeDifference"] = df["timeFromStart"].diff()
            df["time"] = time_started + pd.to_timedelta(
                df.loc[:, "timeFromStart"], unit="ms"
            )

            # Identify problematic rows: NaN in any column
            mask_bad = df[df[["heartRate", "confidence"]].isna().any(axis=1)]
            n_bad = mask_bad.shape[0]
            if n_bad > 0:
                utils.logging.warning(f"Dropping {n_bad} rows with NaN values.")
                df.drop(index=list(mask_bad.index), inplace=True)

        else:
            utils.logging.error(f"   - No sample data!!! {file_name}")
            df = pd.DataFrame({})

        return df

    def _read_hr_accel_data():
        metadata = []
        rows_hr = []
        rows_accel = []

        hr_cols = column_names
        accel_cols = ["timeFromStart", "x", "y", "z", "magnitude", "difference"]

        with open(file_name, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line:
                    continue

                # Process JSON data
                if line[0] == "{":
                    try:
                        obj = json.loads(line)
                        metadata.append(obj)
                    except json.JSONDecodeError:
                        utils.logging.warning("Error reading JSON")
                    continue

                # Try to read csv data
                row = next(csv.reader([line]))
                if not row:
                    continue

                # Check for acceleration row
                if row[0].startswith("A") and len(row) == len(accel_cols):
                    row[0] = row[0].strip("A")
                    rows_accel.append(row)
                elif row[0].startswith("A") and len(row) != len(accel_cols):
                    utils.logging.warning(f"Bad accel row: {row}")
                # Check for heart rate row
                elif row[0][0].isdigit() and len(row) == len(hr_cols):
                    rows_hr.append(row)
                elif row[0][0].isdigit() and len(row) != len(hr_cols):
                    utils.logging.warning(f"Bad hr row: {row}")
                else:
                    utils.logging.warning(f"Unknown data: {row}")

        # get time recording was started
        time_started = pd.NaT
        try:
            time_started = check.RecordStart[0]
        except Exception as e:
            utils.logging.error(f"Did not find start time! [error: {e}]")

        # Create dataframes from rows
        # ===== Heart rate ===========
        # TODO: repeated code, clean this up
        df_hr = (
            pd.DataFrame(
                rows_hr,
                columns=hr_cols,
            )
            if rows_hr
            else pd.DataFrame(columns=hr_cols)
        )

        df_hr["timeFromStart"] = df_hr["timeFromStart"].astype("int")
        df_hr["heartRate"] = df_hr["heartRate"].astype("int")
        df_hr["confidence"] = df_hr["confidence"].astype("int")
        df_hr["ppgRaw"] = df_hr["ppgRaw"].astype("int")
        df_hr["ppgFilter"] = df_hr["ppgFilter"].astype("int")
        df_hr["heartRate"] = (df_hr["heartRate"] / 10).astype("int")
        df_hr["timeDifference"] = df_hr["timeFromStart"].diff()
        df_hr["time"] = time_started + pd.to_timedelta(
            df_hr.loc[:, "timeFromStart"], unit="ms"
        )
        # Identify problematic rows: NaN in any column
        mask_bad = df_hr[df_hr[["heartRate", "confidence"]].isna().any(axis=1)]
        n_bad = mask_bad.shape[0]
        if n_bad > 0:
            utils.logging.warning(f"Dropping {n_bad} rows with NaN values.")
            df_hr.drop(index=list(mask_bad.index), inplace=True)

        # ===== Acceleration =========
        df_accel = (
            pd.DataFrame(rows_accel, columns=accel_cols)  # type: ignore
            if rows_accel
            else pd.DataFrame(columns=accel_cols)  # type: ignore
        )

        df_accel["timeFromStart"] = df_accel["timeFromStart"].astype("int")
        df_accel["x"] = df_accel["x"].astype("int")
        df_accel["y"] = df_accel["y"].astype("int")
        df_accel["z"] = df_accel["z"].astype("int")
        df_accel["magnitude"] = df_accel["magnitude"].astype("int")
        df_accel["difference"] = df_accel["difference"].astype("int")
        df_accel["timeDifference"] = df_accel["timeFromStart"].diff()
        df_accel["time"] = time_started + pd.to_timedelta(
            df_accel.loc[:, "timeFromStart"], unit="ms"
        )

        # Add watch id to dfs
        id = "Unknown"
        try:
            id = metadata[0]["File"]["PhysicalID"]
        except Exception as e:
            utils.logging.error(f"Could not read id data: {e}")
        finally:
            df_hr["watchId"] = id
            df_accel["watchId"] = id

        return df_hr, df_accel

    if check.filter(regex=r"^Samples_accel").eq(0).all(axis=0).any():  # type: ignore
        df_out = _read_hr_data()
    else:
        df_out = _read_hr_accel_data()

    return df_out


def flag_records(df, config_dat, flag_length=True, flag_samples=True):
    """Flag records outside of minimum length and contain minimum
    number of samples
    """
    seconds = config_dat["access_data"]["minimum_record_length"]
    min_length = pd.to_timedelta(seconds, unit="s")
    min_sample_rate = config_dat["access_data"]["minimum_sample_rate"]

    msg_duration = (
        f"duration less than {seconds} seconds [{seconds / 60} mins]"
        if flag_length
        else "[ignore duration]"
    )
    msg_samples = (
        f"sample rate less than {min_sample_rate} samples/sec"
        if flag_samples
        else "[ignore samples]"
    )
    utils.logging.info("Flagging records with: " + msg_duration + " or " + msg_samples)

    df_flagged = df.copy()
    if flag_length:
        # Record shorter than len (shortest condition)
        df_flagged["length_ok"] = df["Duration"] >= min_length
    if flag_samples:
        # Low sample rate (missed samples)
        df_flagged["samples_ok"] = (
            df["Samples_hr"] >= min_length.seconds * min_sample_rate
        )
    df_flagged = df_flagged[~df_flagged.filter(regex=r"_ok$").all(axis=1)]

    log_cols = ["File", "Duration", "Samples_hr"] + df_flagged.filter(
        regex=r"_ok$"
    ).columns.tolist()

    utils.logging.warning(
        f" - Flagged {len(df_flagged)} records\n{df_flagged[log_cols]}"
    )

    return df_flagged


def get_raw_watch_data(df_check, config_dat, save_data=True, force_processing=True):
    """Read raw watch data listed as files in df_check"""
    ft = "." + config_dat["access_data"]["storage_file_type"]
    file_dir = config_dat["directories"]["data"]["processed"]
    file_hr = file_dir + "raw_hr_data_full" + ft
    file_accel = file_dir + "raw_accel_data_full" + ft

    df_hr = pd.DataFrame(
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
    )

    df_accel = pd.DataFrame(
        {
            "watchId": [],
            "timeFromStart": [],
            "time": [],
            "x": [],
            "y": [],
            "z": [],
            "magnitude": [],
            "difference": [],
            "timeDifference": [],
        }
    )

    if force_processing or not utils.check_existing(file_hr):
        utils.logging.info("Reading raw watch data from files:")

        for f in df_check["File"].values:
            df_tmp = get_file(f, config_dat)
            if isinstance(df_tmp, tuple):
                # Process hr and accel data
                df_hr = pd.concat([df_hr.astype(df_tmp[0].dtypes), df_tmp[0]])
                df_accel = pd.concat([df_accel.astype(df_tmp[1].dtypes), df_tmp[1]])
            elif not (df_tmp.empty):
                # Process hr only
                df_hr = pd.concat([df_hr.astype(df_tmp.dtypes), df_tmp])
            else:
                utils.logging.error("Could not read file data.")

        df_hr["watchId"] = df_hr["watchId"].astype("category")
        df_accel["watchId"] = df_accel["watchId"].astype("category")

        if save_data:
            if not df_hr.empty:
                write_dataframe(df_hr, file_hr, config_dat)
            if not df_accel.empty:
                write_dataframe(df_accel, file_accel, config_dat)
    else:
        try:
            df_hr = read_dataframe(file_hr, config_dat)
        except Exception as e:
            utils.logging.error(f"Could not read file: {e}")

        try:
            df_accel = read_dataframe(file_accel, config_dat)
        except Exception as e:
            utils.logging.error(f"Could not read file: {e}")

    if not df_accel.empty:
        df_out = (df_hr, df_accel)
    elif not df_hr.empty:
        df_out = df_hr
    else:
        utils.logging.error("Did not return data!")
        df_out = None

    return df_out


def trim_raw_watch_data(df, config_dat, save_data=True, force_processing=True):
    def _get_time(ts):
        tz = pytz.timezone(config_dat["timezone"])
        ts = pd.to_datetime(ts)
        if ts.tzinfo is None:  # naive datetime
            return tz.localize(ts)
        else:  # already tz-aware
            return ts.astimezone(tz)

    file_name = (
        config_dat["directories"]["data"]["processed"] + "raw_data_trimmed.parquet"
    )

    if force_processing or not utils.check_existing(file_name):
        # Get start/end timestamps
        period_start = _get_time(config_dat["access_data"]["trim_data_before"])
        period_end = _get_time(config_dat["access_data"]["trim_data_after"])

        utils.logging.info("Trimming raw data:")
        utils.logging.info(f" - Using period from: {period_start} -- {period_end}")

        df_out = df[(df["time"] > period_start) & (df["time"] < period_end)].copy()
        if save_data:
            df_out.to_parquet(file_name)
    else:
        df_out = pd.read_parquet(file_name)

    return df_out


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
