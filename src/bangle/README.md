## Description

Code for the [Bangle.js 2](https://banglejs.com) watch application that records timestamped heart rate and raw PPG sensor data at \~25 Hz.

## Loading Innocents App to watch

Communication with watch requires a Bluetooth enabled web browser (Safari does not support BT).

### Manual Installation

#### Use the custom loader

1.  Go to <https://mayabflannery.github.io/customBangleApps/>

2.  Select the "Bangle.js 2" button.

3.  Ensure "Bootloader", "Battery Level Widget", "[TODO] Innocents App", "Launcher", and "Bluetooth Widget" are all Favorited (the heart icon is red).

4.  Click the "More..." tab.

5.  Click on "Always update time when we connect".

6.  Click "Install favorite apps".

#### Load watch ID

1.  Go to <https://www.espruino.com/ide/>

2.  Click connect icon in top left corner.

3.  Enter the following code into right side of the IDE:

    Edit `"<desired ID>"` to the watch ID.

    ``` javascript
    let info = {
      "PhysicalID": "Watch 01",
    };
    require("Storage").writeJSON("physicalID.json", info);
    console.log("SERIAL: ", process.env.SERIAL);
    console.log("MAC id: ", NRF.getAddress());
    ```

4.  Click the Send to Espruino icon.

5.  The Serial number and MAC id will print in the console on the left side of the IDE.

6.  These values can be manually copied and stored for your won records.

## Files

### `app.png`

-   Application image for App Loader display

-   Create image icon [here](https://www.espruino.com/Bangle.js+First+App) (see [tutorial](https://www.espruino.com/Bangle.js+First+App))

    -   Select 'Use compression?'

    -   Select 'Transparency?'

    -   Select Colours \> 'Optimal 2 bit'

    -   Do not format the resulting string (autoformatter caused web loader errors).

### `app-icon.js`

-   Application image for watch display.

### `app.js`

-   Watch application – records heart rate, heart rate confidence, and raw/filtered PPG values at 25 Hz.

-   Stores data on the watch in time stamped files.

### `ChangeLog`

-   Required when updating the watch application for the App Loader.

### `metadata.json`

-   Required for watch bootloader.

    -   App is defined as a 'clock' so it loads directly when the watch is reset.
