import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def plot_raw_data(df, config_dat):
    """Plot all raw data"""
    # TODO: currently downsamples, move to better plotting package?
    dir_fig_out = config_dat["directories"]["figures"]
    resample_df = df.groupby("watchId").resample("5s", on="time").mean()
    resample_df.reset_index(inplace=True)
    fig = px.line(
        resample_df,
        x="time",
        y="heartRate",
        color="watchId",
    )
    fig.update_traces(marker_size=3)
    fig.update_layout(showlegend=False)
    fig.write_image(dir_fig_out + "fig_raw_data.svg")
    return fig


# Datashader
import xarray as xr
import datashader as ds
import datashader.transfer_functions as tf


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
        ds.utils.export_image(img, dir_fig_out + f"fig_raw_{value}_{w}")
