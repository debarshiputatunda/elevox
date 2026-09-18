# V7.0.1 hotspot reliability patch

Download [v7.0.1](https://github.com/debarshiputatunda/elevox/releases/tag/v7.0.1): **425408 bytes** (about 415 KiB), below 2 MB.

- Removes long interrupt blocking during LOW hook discharge while preserving all three sensing modes.
- Starts in AP-only mode, waits 60 seconds before automatic router association, and protects connected/recent hotspot clients from automatic attempts.
- Turns STA off between failed attempts; explicit Connect remains available.
- Retains settings and HIGH calibration. LOW calibrations start fresh because timing is now interruptible; recalibrate them if used.
- Adds Wi-Fi channel/mode and connection-attempt diagnostics.

Build with `firmware/build_v7.sh`. Use the firmware field at `http://192.168.4.1/update`, or USB/serial flashing if the old hotspot cannot sustain an upload. Open **http://192.168.4.1/** manually after reboot. The simulated checks do not establish physical RF stability; see [v7 setup](../../docs/V7_SETUP.md).

# V7.0.0 OTA image

Download the binary and checksum from the [v7.0.0 release](https://github.com/debarshiputatunda/elevox/releases/tag/v7.0.0).

- Binary: `elevox-v7.0.0.bin`, **424112 bytes** (about 414 KiB).
- Three saved modes: V6 HIGH guard, LOW guard by hook (default), and alternating LOW guard.
- V6.2 settings/features retained, with separate optional calibration per mode.
- Target: ESP8266 NodeMCU v2, 80 MHz, 4 MB flash / 2 MB filesystem, core 3.1.2.
- Build: `firmware/build_v7.sh`; no local router credentials compiled in.
- Upload via the firmware field at `http://192.168.4.1/update`, then choose **Sensing mode** on the page.

Read [v7 setup](../../docs/V7_SETUP.md) for timeout policy and mode switching. Physical flashing and analog/RF behavior remain unverified. Existing threshold numbers are retained; verify them for the selected mode.

# V6.2.0 OTA image

Download the binary and checksum from the [v6.2.0 release](https://github.com/debarshiputatunda/elevox/releases/tag/v6.2.0), or run `firmware/build_v6.sh` to generate them locally.

- Binary: `elevox-v6.2.0.bin`, **418576 bytes** (about 409 KiB).
- Target: ESP8266 NodeMCU v2, 80 MHz, 4 MB flash / 2 MB filesystem, core 3.1.2.
- No local router credentials compiled in; existing EEPROM settings migrate or remain preserved.
- Upload through the firmware field at `http://192.168.4.1/update`, or the device's router address.
- After reboot, open `http://192.168.4.1/` manually. Captive popups are disabled.

OTA also requires enough free update space on the currently flashed device. The new settings page displays that capacity. The physical flash and RF connection have not been tested by this release's automated checks. See [setup and behavior](../../docs/V6_SETUP.md).
