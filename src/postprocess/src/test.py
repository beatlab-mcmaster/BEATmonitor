import pandas as pd
import numpy as np
import holoviews as hv
import holoviews.operation.datashader as hd
import datashader as ds
import datashader.transfer_functions as tf
from datashader.utils import export_image
import time

hd.shade.cmap = ["lightblue", "darkblue"]
hv.extension("bokeh", "matplotlib")


def plot_PPG_signal(
    df,
    time_col="time",
    value_col="values",
    output_filename="plot",
    fig_size=(1600, 800),
    output_html=False,
    output_svg=True,
):
    """
    Plot integers timeseries using Datashader

    Parameters:
        df (pd.DataFrame): DataFrame containing the data to plot.
        time_col (str): Column name for time in milliseconds.
        value_col (str): Column name for integer values.
        output_filename (str): Filename to save the plot image.

    Returns:
        A plot of the data using Datashader.
    """
    if time_col not in df.columns or value_col not in df.columns:
        raise ValueError(
            f"DataFrame must contain '{time_col}' and '{value_col}' columns."
        )

    start_time = time.time()  # Start timing

    # Create a Holoviews Points +Datashader object
    hv.output(backend="bokeh")
    points = hv.Curve(df)

    if output_html:
        # Plot settings (See: https://holoviews.org/user_guide/Plotting_with_Bokeh.html#)
        points.opts(width=fig_size[0], height=fig_size[1], tools=["hover"])

    hv.save(points, f"{output_filename}.html")

    if output_svg:
        # Plot settings (See: https://holoviews.org/user_guide/Plotting_with_Matplotlib.html#)
        hv.output(backend="matplotlib")
        points.opts(aspect=2, fig_inches=fig_size[0] / 100)
        hv.save(points, f"{output_filename}.svg")

    end_time = time.time()  # End timing
    elapsed_time = end_time - start_time  # Calculate elapsed time

    # Print elapsed time
    print(f"Rendered: '{output_filename}' [in {elapsed_time:.2f} seconds]")

    plot = hd.datashade(
        points
    )  # TODO: No effect with save; Check this output in notebook

    return plot


# Example Usage:
# Create example data
points = round(1e6)

data = {
    "time": np.linspace(0, 360 * 10, points),  # time in milliseconds
}
data["values"] = np.sin(np.pi / 360 * data["time"])  # arbitrary values
df = pd.DataFrame(data)

plot_PPG_signal(df, output_html=True)

# TODO: Test with PPG data!
#
