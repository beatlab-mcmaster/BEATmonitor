import plotly.express as px

# import plotly.graph_objects as go
# from plotly.subplots import make_subplots


# Datashader
# import xarray as xr
import datashader as ds
import datashader.transfer_functions as tf
import datashader.utils as utils


def plotly_data(df, config_dat):
    """Plot all raw data"""
    dir_fig_out = config_dat["directories"]["figures"]
    # Downsample dataframe
    if len(df) > config_dat["reporting"]["plot_max_samples"]:
        # Calculate sample rate
        sample_rate = round(len(df) / config_dat["reporting"]["plot_max_samples"])
        print(f"Resampling raw data to {sample_rate} seconds")  # TODO: ms?
        df = df.groupby("watchId").resample(f"{sample_rate}s", on="time").mean()
    df.reset_index(inplace=True)
    fig = px.line(
        df,
        x="time",
        y="heartRate",
        color="watchId",
        labels={
            "time": "Time (S)",
            "heartRate": "Heart Rate (BPM)",
            "watchId": "Watch ID",
        },
        title="Raw Data",
    )
    fig.update_traces(marker_size=3)
    fig.update_layout(showlegend=True)
    fig.write_image(dir_fig_out + "fig_raw_data.svg")
    return fig


def get_ds_aggs(df, name_y, h=1500, w=4000):
    # datashader does not have native date support -- convert time to int
    d = df.copy()
    d.loc[:, "ITime"] = d["time"].astype("int64")
    d.sort_values("ITime", inplace=True)
    dx_min = d["ITime"].min()  # For manual scaling of img
    dx_max = d["ITime"].max()
    dy_min = d[name_y].min() - 2
    dy_max = d[name_y].max() + 2

    # For multiple plots (each HR timeseries), cvs must be same size
    cvs = ds.Canvas(
        x_range=(dx_min, dx_max), y_range=(dy_min, dy_max), plot_height=h, plot_width=w
    )
    aggs = {}
    for c in d["watchId"].unique():
        aggs[c] = cvs.line(d[d["watchId"] == c], "ITime", name_y)
    return aggs


def plot_raw_individual_watches(df, config_dat, value="heartRate"):
    dir_fig_out = config_dat["directories"]["figures"]
    df_agg = get_ds_aggs(df, value)
    for w in df_agg.keys():
        img = tf.shade(df_agg[w])
        utils.export_image(img, dir_fig_out + f"fig_raw_{value}_{w}")
