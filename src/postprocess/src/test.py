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


def plot_integer_column(
    df, time_col="time", value_col="values", output_filename="plot"
):
    """
    Plot integers from a DataFrame using Datashader, and print the time elapsed to produce the plot.

    Parameters:
        df (pd.DataFrame): DataFrame containing the data to plot.
        time_col (str): Column name for time in milliseconds.
        value_col (str): Column name for integer values.
        output_filename (str): Filename to save the plot image.

    Returns:
        None
    """
    if time_col not in df.columns or value_col not in df.columns:
        raise ValueError(
            f"DataFrame must contain '{time_col}' and '{value_col}' columns."
        )

    start_time = time.time()  # Start timing

    # Create a Datashader Canvas
    canvas = ds.Canvas(
        plot_width=800,
        plot_height=400,
        x_range=(df[time_col].min(), df[time_col].max()),
        y_range=(df[value_col].min(), df[value_col].max()),
    )

    # Aggregate the data
    aggregation = canvas.line(df, x=time_col, y=value_col)

    # Create a plot
    image = tf.shade(aggregation, cmap=["lightblue", "darkblue"])

    # Export the image
    export_image(image, filename=output_filename, background="white")

    end_time = time.time()  # End timing
    elapsed_time = end_time - start_time  # Calculate elapsed time

    # Print elapsed time
    print(f"Plot produced: '{output_filename}.png' [time: {elapsed_time:.2f} seconds]")


# Example Usage:
# Create example data
points = round(1e7)

data = {
    "time": np.linspace(0, 360 * 10, points),  # time in milliseconds
}

data["values"] = np.sin(np.pi / 360 * data["time"])  # arbitrary values

df = pd.DataFrame(data)

plot_integer_column(df)

points = hv.Points(df.sample(10000))
points.opts(width=800, height=400, tools=["hover"], color="values", cmap="viridis")
hv.save(points, "points.html")
