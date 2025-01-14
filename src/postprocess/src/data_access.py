import os
import re
import pandas as pd

tz = None


def get_study_file_list(data_dir, match_criteria=r".*\.csv"):
    """Return a sorted list of files matching specified criteria"""
    files = [i for i in os.listdir(data_dir) if re.match(match_criteria, i)]
    return sorted(files)


def check_file(file_name):
    """Return a (single row) dataframe with 'Watch', 'File' name, 'MAC' address, and
    when the Record was started, ended, and the number of samples
    """
    # print(f'Checking file name: {file_name}')
    samples = 0
    t_rs = t_re = ""
    with open(file_name, encoding="utf-8") as f:
        for j, line in enumerate(f):
            if j == 0:
                try:
                    t_mac = re.search(
                        r'(?<="MAC":")(..:..:..:..:..:..)(")', line
                    ).group(1)
                    watchID = re.search("W...", line).group(0)
                except AttributeError:
                    watchID = "ERR"
                    t_mac = "CHECK FILE"
            elif j == 1:
                try:
                    t_rs = re.search(r'(?<="UNIXTimeStamp":")(.*)(",")', line).group(1)
                except:
                    print("Could not find start timestamp!")
            elif re.search("STOP_RECORD", line):
                try:
                    t_re = re.search(r'(?<="UNIXTimeStamp":")(.*)(",")', line).group(1)
                except:
                    print("Could not find stop timestamp!")
            else:
                # TODO: add check for bad lines
                samples += 1

    # Convert time to datetime/EDT
    t_recStart = pd.to_datetime(t_rs, utc=True).tz_convert(tz)
    t_recFinish = pd.to_datetime(t_re, utc=True).tz_convert(tz)

    try:
        duration = t_recFinish - t_recStart
    except TypeError:
        duration = 0

    df = pd.DataFrame.from_dict(
        {
            "Watch": [watchID],
            "File": [file_name],
            "MAC": [t_mac],
            "RecordStart": [t_recStart],
            "RecordFinish": [t_recFinish],
            "Duration": [duration],
            "Samples": [samples],
        }
    )
    return df


def check_files_in_directory(config_dat):
    tz = config_dat["timezone"]
    file_dir = config_dat["directories"]["data"]["raw"]
    summary_dir = config_dat["directories"]["data"]["summary"]
    """Return a dataframe with summary of data files in specified directory"""
    df = pd.DataFrame(
        {
            "Watch": [],
            "File": [],
            "MAC": [],
            "RecordStart": [],
            "RecordFinish": [],
            "Duration": [],
            "Samples": [],
        }
    )
    for i, d in enumerate(get_study_file_list(file_dir)):
        df_file_summary = check_file(file_dir + d)
        df = pd.concat([df, df_file_summary])
    df = df.set_index("Watch", inplace=False).sort_index()
    df.to_csv(summary_dir + "raw_data_summary.csv")
    return df


def get_file_summary(
    file_name,
    column_names=["timeFromStart", "heartRate", "confidence", "ppgRaw", "ppgFilter"],
):
    """Return a dataframe summarising a single file
    Note: Some pilot studies have different column names
    """
    print(f">>>>>> {file_name}")
    check = check_file(file_name)

    if check.Samples[0] > 1:
        try:
            time_started = check.RecordStart[0]
        except:
            print("Did not find start time!")

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
        df["time"] = time_started + pd.to_timedelta(df["timeFromStart"], unit="ms")
        duration = df["time"].iloc[-1] - time_started
    else:
        df = pd.DataFrame({})

    return df


def check_records_ts(df, config_dat):
    """Flag records outside of minimum length and contain minimum
    number of samples
    """
    min_length = pd.to_timedelta(
        config_dat["access_data"]["minimum_record_length"], unit="s"
    )
    min_sample_rate = config_dat["access_data"]["minimum_sample_rate"]
    return df[
        (df["Duration"] < min_length)  # Record shorter than len (shortest condition)
        | (
            df["Samples"] < min_length.seconds * min_sample_rate
        )  # Low sample rate (missed samples)
    ]


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

    for i, f in enumerate(df_check["File"].values):
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
    print(f"Trimming raw data from: {period_start} -- {period_end}")
    df = df[(df["time"] > period_start) & (df["time"] < period_end)]
    if save_data:
        df.to_parquet(df_dir_out + "raw_data_trimmed.parquet")
    return df
