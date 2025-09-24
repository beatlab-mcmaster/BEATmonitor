from . import utils
import pandas as pd
import neurokit2 as nk


def resample_df(df, sample_rate=40, interpolation_rate=1):
    """Resample data at provided sample rate and interpolation rate"""
    utils.logging.info(
        f"Resampling data at: {sample_rate}ms;"
        + f"interpolation at: {interpolation_rate}ms"
    )
    df.set_index("time", inplace=True)
    df_out = df.groupby("watchId", observed=True).apply(
        lambda g: (
            g.resample(f"{interpolation_rate}ms")
            .mean()
            .interpolate(method="linear")
            .resample(f"{sample_rate}ms")
            .mean()
        )
    )

    return df_out


def resample_HR(df, config_dat, save_data=True, force_processing=True):
    resample_rate = config_dat["pipelines"]["HR_resample_rate"]
    file_name = (
        config_dat["directories"]["data"]["processed"]
        + f"resampled_HR_{resample_rate}ms.parquet"
    )
    if force_processing or not utils.check_existing(file_name):
        exclude_cols = ["timeFromStart", "ppgRaw", "ppgFilter", "timeDifference"]
        utils.logging.info(f"Resampling data at: {resample_rate}ms")
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
            df_out.to_parquet()
    else:
        df_out = pd.read_parquet(file_name)

    return df_out


def resample_PPG(df, config_dat, save_data=True, force_processing=True):
    resample_rate = config_dat["pipelines"]["PPG_resample_rate"]
    interpolation_rate = config_dat["pipelines"]["interpolation_rate"]
    utils.logging.info("Resample PPG:")
    file_name = (
        config_dat["directories"]["data"]["processed"]
        + f"resampled_PPG_{resample_rate}ms.parquet"
    )

    if force_processing or not utils.check_existing(file_name):
        utils.logging.info(
            f" - Resampling data at: {resample_rate}ms [{interpolation_rate}ms interpolation]"
        )
        df_out = (
            df.drop(["timeFromStart", "timeDifference"], axis=1)
            .copy()
            .set_index("time")
        )

        # Interpolate does not like categoricals, convert to int
        cats_watch = df_out["watchId"].cat.categories  # remember watch names
        cats_trial = df_out["Trial"].cat.categories  # remember trial names
        df_out["watchId"] = df_out["watchId"].cat.codes.astype(int)
        df_out["Trial"] = df_out["Trial"].astype(int)

        df_out = (
            df_out.groupby("watchId", observed=True)
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

        # Convert watchId back to category with names
        df_out["watchId"] = (
            df_out["watchId"].astype("category").cat.rename_categories(cats_watch)
        )
        df_out["Trial"] = (
            df_out["Trial"]
            .astype(int)
            .astype("category")
            .cat.rename_categories(cats_trial)
        )

        if save_data:
            utils.logging.info(f" >> Saving resampled PPG data to {file_name}")
            df_out.to_parquet(file_name)
    else:
        df_out = pd.read_parquet(file_name)

    return df_out


def PPG_find_peaks(df, config_dat, save_data=True, force_processing=True):
    utils.logging.info("Find peaks from PPG:")
    sample_rate = config_dat["pipelines"]["PPG_resample_rate"]
    file_name = (
        config_dat["directories"]["data"]["processed"]
        + f"peaks_{sample_rate}ms.parquet"
    )

    if force_processing or not utils.check_existing(file_name):
        utils.logging.info("Calculating peaks")
        frequency = 1000 / sample_rate  # in Hz (samples/second)
        df_out = pd.DataFrame()
        for _, g in df.groupby("watchId", observed=True):
            sig, _ = nk.ppg_process(g["ppgRaw"], sampling_rate=frequency)
            g = g.join(sig.set_index(g.index))
            df_out = pd.concat([df_out, g])
        if save_data:
            utils.logging.info(f" >> Saving peaks data to {file_name}")
            df_out.to_parquet(file_name)
    else:
        df_out = pd.read_parquet(file_name)

    return df_out
