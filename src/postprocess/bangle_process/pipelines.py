# TODO: import pandas for all files?
import pandas as pd
import neurokit2 as nk


def resample_HR(df, config_dat, save_data=False):
    resample_rate = config_dat["pipelines"]["HR_resample_rate"]
    df_dir_out = config_dat["directories"]["data"]["processed"]
    exclude_cols = ["timeFromStart", "ppgRaw", "ppgFilter", "timeDifference"]
    print(f"Resampling data at: {resample_rate}ms")
    df.set_index("time", inplace=True)
    df_out = (
        df.drop(exclude_cols, axis=1)
        .groupby(["watchId"])
        .resample(f"{resample_rate}ms")
        .mean("heartRate")
    )
    # Compute heart period TODO: need to leave this in?
    df_out["heartPeriod"] = round(60000 / df_out["heartRate"], 3)
    if save_data:
        df_out.to_parquet(df_dir_out + f"resampled_HR_{resample_rate}ms.parquet")
    return df_out


def resample_PPG(df, config_dat, save_data=False):
    resample_rate = config_dat["pipelines"]["PPG_resample_rate"]
    interpolation_rate = config_dat["pipelines"]["interpolation_rate"]
    df_dir_out = config_dat["directories"]["data"]["processed"]
    print(
        f"Resampling data at: {resample_rate}ms [{interpolation_rate}ms interpolation]"
    )
    df.set_index("time", inplace=True)  # TODO: fix need to reset index
    df_out = (
        df.groupby("watchId")
        .resample(f"{interpolation_rate}ms")
        .interpolate()  # interpolate (works best at 1ms) # TODO
        .drop("watchId", axis=1)
        .reset_index(level=0)  # 'ungroup'
        .groupby("watchId")
        .resample(f"{resample_rate}ms")
        .first()  # resample at desired rate
        .drop("watchId", axis=1)
        .reset_index(level=0)  # ungroup again
    )
    if save_data:
        df_out.to_parquet(df_dir_out + f"resampled_PPG_{resample_rate}ms.parquet")
    return df_out


def PPG_find_peaks(df, config_dat):
    sample_rate = config_dat["pipelines"]["PPG_resample_rate"]
    frequency = 1000 / sample_rate  # in Hz (samples/second)
    df_out = pd.DataFrame()
    for i, g in df.groupby("watchId"):
        sig, info = nk.ppg_process(g["ppgRaw"], sampling_rate=frequency)
        g = g.join(sig.set_index(g.index))
        df_out = pd.concat([df_out, g])
    return df_out
