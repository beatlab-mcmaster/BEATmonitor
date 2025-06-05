import plotly.express as px

# import plotly.graph_objects as go
# from plotly.subplots import make_subplots


# Datashader
# import xarray as xr
import holoviews as hv
from holoviews import opts
import datashader as ds
from holoviews.operation.datashader import datashade
from bokeh.models import DatetimeTickFormatter

# from bokeh.io.export import export_svgs
import datashader.transfer_functions as tf
import datashader.utils as utils

hv.extension("bokeh")

# TODO: Check if plots are already made!


def plot_hv(df, name_y, config_dat, confidence_threshold=5, h=400, w=1000):
    if not isinstance(name_y, list):
        name_y = [name_y]

    print(f"Plotting {name_y} with Holoviews")

    dir_fig_out = config_dat["directories"]["figures"]
    d = df.copy()
    d["ITime"] = d["time"].astype("int64") // 1_000_000
    d = d.sort_values("ITime")

    # Hook to adjust x-axis formatter
    def apply_datetime_axis(plot, element):
        p = plot.state
        p.xaxis.formatter = DatetimeTickFormatter(
            milliseconds="%H:%M:%S.%3N",
            seconds="%H:%M:%S",
            minsec="%H:%M:%S",
            minutes="%H:%M",
            hourmin="%H:%M",
            hours="%H:%M",
            days="%Y-%m-%d",
            months="%Y-%m",
            years="%Y",
        )
        p.xaxis.axis_label = "Time"

    # Create a Holoviews Curve
    for watch_id in d["watchId"].unique():
        subplots = []  # container for each variable's plot
        flat_names = []

        for n in name_y:
            if not isinstance(n, list):
                n = [n]
            curves = []
            for c in n:
                flat_names.append(c)
                curve = hv.Curve(
                    (
                        d[d["watchId"] == watch_id]["ITime"],
                        d[d["watchId"] == watch_id][c],
                    ),
                    kdims=["ITime"],
                    vdims=[c],
                    label=c,
                ).opts(interpolation="linear", line_width=0.5, color="black")
                curves.append(curve)

            overlay = hv.Overlay(curves).opts(
                title=f"'{n}' data for Watch {watch_id}",
                xlabel="Time",
                ylabel="\n".join(n),
                width=w,
                height=h,
                hooks=[apply_datetime_axis],
            )

            subplots.append(overlay)

        # Combine all subplots into a vertical layout
        layout = hv.Layout(subplots).cols(1)

        # Save as HTML
        filename = f"{dir_fig_out}fig_raw_{'_'.join(flat_names)}_{watch_id}.html"
        hv.save(layout, filename)

        # bokeh_fig = hv.renderer("bokeh").get_plot(overlay).state
        # bokeh_fig.output_backend = "svg"
        # export_svgs(
        #     bokeh_fig, filename=dir_fig_out + f"fig_raw_{name_y}_{watch_id}.svg"
        # )


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


def plotly_data(df, config_dat):
    """Summarize all raw data with plotly"""
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
