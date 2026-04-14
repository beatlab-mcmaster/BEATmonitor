# Description

Code for the [Bangle.js 2](https://banglejs.com) watch application that records
timestamped heart rate and raw PPG sensor data at approximately 25 Hz.

## Files

### `app.png`

- Application image for App Loader display

- Create image icon [here](https://www.espruino.com/Bangle.js+First+App) (see [tutorial](https://www.espruino.com/Bangle.js+First+App))

- Select 'Use compression?'

  - Select 'Transparency?'

  - Select Colours \> 'Optimal 2 bit'

  - Do not format the resulting string (autoformatter caused web loader errors).

### `app-icon.js`

- Application image for watch display.

### `app.js`

- Watch application – records heart rate, heart rate confidence, and
  raw/filtered PPG values at 25 Hz.

- Stores data on the watch in time stamped files.

### `ChangeLog`

- Required when updating the watch application for the App Loader.

### `metadata.json`

- Required for watch bootloader.

  - App is defined as a 'clock' so it loads directly when the watch is reset.

## Loading the BEATmonitor App to a Bangle.js 2 watch

> [!NOTE]
>
> Communication with watch requires a Bluetooth enabled web browser (Safari
> does not support BT).

### Manual installation

There are two options available for installing the BEATmonitor watch application
to a Bangle.js 2 watch.

#### Use the custom loader

> [!WARNING]
>
> The watch application is temporarily stored in the following custom repository.
> The application will be added to the official
> [Bangle.js App Loader](https://banglejs.com/apps/) soon (i.e., pushed to
> <https://github.com/espruino/BangleApps>).

1. Go to <https://mayabflannery.github.io/customBangleApps/>
2. Select the "Bangle.js 2" button.
3. Ensure "Bootloader", "Battery Level Widget", "BEATmonitor App",
   "Launcher", and "Bluetooth Widget" are all Favorited (the heart icon is red).
4. Click the "More..." tab.
5. Click on "Always update time when we connect".
6. Click "Install favorite apps".

#### Load watch ID

1. Go to <https://www.espruino.com/ide/>

2. Click connect icon in top left corner.

3. Enter the following code into right side of the IDE:

   Edit `"<desired ID>"` to the watch ID.

   ```javascript
   let info = {
     PhysicalID: "Watch 01",
   };
   require("Storage").writeJSON("physicalID.json", info);
   console.log("SERIAL: ", process.env.SERIAL);
   console.log("MAC id: ", NRF.getAddress());
   ```

4. Click the Send to Espruino icon.

5. The Serial number and MAC id will print in the console on the left side of
   the IDE.

6. These values can be manually copied and stored for your won records.

### Updated configuration

```javascript
sn="";
oldSettings = require("Storage").readJSON("beatSettings.json");
let settings = {
  physicalId: oldSettings.physicalId,
  recordHR: false,
  recordAccel: true,
  allowManual: false,
  maxStorage: 90,
  minStorage: 5,
  maxTrash: 60,
  enableHighSpeed: true,
  highSpeedPollRate: 20,
  seatNumber: sn,
};
setSettings(settings);
require("Storage").writeJSON("beatSettings.json", settings);
console.log("SERIAL: ", process.env.SERIAL);
console.log("MAC id: ", NRF.getAddress());
console.log(require("Storage").readJSON("beatSettings.json"));
```

### Dashboard installation

> [!NOTE]
>
> The ability to install the watch application from the BEATmonitor
> [dashboard](/src/dashboard/README.md) is coming soon!

## Using the BEATmonitor App

Attach the Bangle.js 2 watch snugly to the individual's wrist. Ideally, the
watch should not be too tight; but to minimize motion artifacts in the data
(which are low-quality and difficult to analyse), it is important that the
watch (i.e., the PPG sensor) does not move easily when the individual moves
their arm or body.

### Manual operation

> [!WARNING]
>
> Manual operation does not have a 'synchronize time' function. For recording
> from multiple watches, it is recommended to use the
> [BEATmonitor Dashboard](/src/dashboard/README.md)

To start recording on the watch manually:

1. Press the right side button once, then
2. Touch the box with the word 'WAITING' on the watch face

![The BEATmonitor watch face (Recording).](/res/images/watch-face.png)

The box will change to 'RECORDING' and the number of collected samples will
be updated once per minute.

To stop recording on the watch manually:

1. Rapidly press the right side button 7 times in 2 seconds (this is to
   prevent tampering or accidental stopping of a record)

The box will change back to 'WAITING'.

### Remote operation

See the [BEATmonitor Dashboard](/src/dashboard/README.md).

## Data

Data should be transferred from watches to your computer using the
[BEATmonitor Dashboard](/src/dashboard/README.md).

All data recorded by the watch are stored in a text file with four sections:

1. The first line of the file contains an object with the file name, watch
   serial number and MAC address, and the configured Id of the watch, for example:

   ```json
   {
     "File": {
       "Name": "04-02T22:43:30_MACx_Widx",
       "Serial": "xxxxxxxx-xxxxxxxx",
       "MAC": "xx:xx:xx:xx:MA:Cx",
       "PhysicalID": "Widx"
     }
   }
   ```

2. The second line of the file contains an object with the start time of the
   record, estimated battery life, and free storage on the watch (the number of
   samples written at this time is 0), for example:

   ```json
   {
     "Record": {
       "State": "START_RECORD",
       "DateTime": "Tue Apr 2 2024 18:43:30 GMT-0400",
       "UNIXTimeStamp": "2024-04-02T22:43:30.610Z",
       "BatteryLife": 100,
       "FreeStorage": 6414364,
       "SamplesWritten": 0
     }
   }
   ```

3. Individual PPG samples are recorded in comma separated value (csv) format,
   for example:

   | timestamp | heartRate | confidence | PPGraw | PPGfilter |
   | --------- | --------- | ---------- | ------ | --------- |
   | 14611     | 890       | 29         | 6206   | -1792     |
   | 14652     | 890       | 29         | 6222   | 2560      |
   | 14694     | 890       | 29         | 6230   | 4352      |
   | 14735     | 890       | 29         | 6230   | 3840      |
   | 14776     | 890       | 29         | 6238   | 5632      |
   | 14820     | 890       | 29         | 6238   | 5120      |
   | 14859     | 890       | 29         | 6254   | 8704      |
   | 14903     | 890       | 29         | 6262   | 9728      |
   | ...       | ...       | ...        | ...    | ...       |

   - `timestamp`: the number of ms from the `Record.UNIXTimeStamp` above (section 2)
   - `heartRate`: the heart rate value calculated by the internal Bangle.js algorithm
   - `confidence`: the confidence in the heart rate reported by the Bangle.js algorithm
   - `PPGraw`: the raw PPG sensor reading for the sample
   - `PPFfilter`: the filtered (by Bangle.js algorithm) PPG value
  
> [!NOTE]
>
> For more information on processing these data, see the (TODO: PPG analysis tutorial)

4. Provided the recording was stopped either manually or via the remote
   dashboard, the last line of the file contains an object with the end time,
   battery life, storage, and number of samples written for the record,
   for example:

   ```json
   {
     "Record": {
       "State": "STOP_RECORD",
       "DateTime": "Tue Apr 2 2024 20:36:57 GMT-0400",
       "UNIXTimeStamp": "2024-04-03T00:36:57.075Z",
       "BatteryLife": 98,
       "FreeStorage": 2359324,
       "SamplesWritten": 159943
     }
   }
   ```

## Resources

### Firmware

#### Upgrading

Firmware can be updated from the official [Bangle.js App Loader](https://banglejs.com/apps/?q=firmware)

> [!CAUTION]
>
> Stop the BEATmonitor dashboard if it is running. Scanning commands sent from the dashboard might interfere with successful firmware installation.

1. Connect to the watch that you want to update.
2. Use the `Firmware Update` application. Select the 'hamburger'.
![Select firmware update application options](/res/images/firmware-01.png)
3. Select the firmware release that you want to install.
![Select firmware release and upload](/res/images/firmware-02.png)
4. Click 'Upload' to start the install.

#### Recovery

If the firmware fails to install, the watch will be caught in a boot cycle (no applications will load). You cannot fix/upgrade the firmware with the App Loader method above.

The watch can be recovered using the [nRF Device Firmware Update](https://play.google.com/store/apps/details?id=no.nordicsemi.android.dfu&pcampaignid=web_share) application on an Android device.

> [!IMPORTANT]
>
> The iOS application does not seem to work!!

On the Android device:

1. Download the firmware version from the [Espruino Downloads page](https://www.espruino.com/Download) (for the Bangle.js 2 board).
2. Open the DFU app and find the `DFUTarg` device.
3. Select the downloaded firmware and upload.

Also, see instructions from the [firmware update documentation](https://www.espruino.com/Firmware+Update#nrf52).

### Bangle.js programming

[Browser IDE](https://www.espruino.com/ide)

[Technical specs](https://www.espruino.com/Bangle.js2)

[Official app loader](https://banglejs.com/apps/)

[Tutorials](https://www.espruino.com/Bangle.js2#tutorials)

[API reference](https://www.espruino.com/Reference#software)
