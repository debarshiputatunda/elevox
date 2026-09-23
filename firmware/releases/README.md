# V8.0.0 saved default Wi-Fi fix

Download [v8.0.0](https://github.com/debarshiputatunda/elevox/releases/tag/v8.0.0): **437,072 bytes**, below 2 MB. Based on the supplied v7.3.1 hook-case archive.

- Connects the saved default shortly after boot even when hotspot clients are present.
- SET DEFAULT enables auto-connect and starts connection; router loss retries the default, then saved fallback profiles with bounded backoff.
- Hotspot remains enabled. Explicit DISCONNECT still persists until SET DEFAULT, CONNECT or SAVE & CONNECT re-enables connection.
- Existing archive sensing, hook-case classification, alarms, calibration and profile storage retained.

Upload the binary via the firmware field at `http://192.168.4.1/update`. No database migration or website changes needed. See [v8 setup](../../docs/V8_SETUP.md). Simulated tests and compilation pass; real RF association remains to be checked on the device.

# V7.2.1 sensing readout visibility

Download [v7.2.1](https://github.com/debarshiputatunda/elevox/releases/tag/v7.2.1): **435,840 bytes**, below 2 MB.

- Link Index and active guard now reach the website and remain visible independently of prediction.
- HIGH guard shows finite partial means or a qualified ≥800,000-cycle timeout instead of unexplained blank values. Invalid readings remain excluded from hook alarm decisions.
- Coupling diagnostics distinguish waiting, passive-reset timeout, no-rise timeout and below-resolution measurements. Failed measurements do not produce a numeric Link Index.
- Sensing polarity, hook timeout/validity rules, ranges, buckle control, saved settings and calibration retained.

Flash the `.bin` through Firmware update and refresh both interfaces. A sustained HIGH input still requires physical investigation; this release exposes the measured condition and does not claim to resolve the circuit. See [setup](../../docs/V7_SETUP.md).

# V7.2.0 dual alarm ranges and faster updates

Download [v7.2.0](https://github.com/debarshiputatunda/elevox/releases/tag/v7.2.0): **433,328 bytes**, below 2 MB.

- Two editable inclusive ranges per hook, initially 10–1,800 and 10,000–1,000,000. Both hooks must match a range; different bands are allowed.
- Saved device-owned settings editable through both interfaces, with conflict and failed-save handling.
- Alarms use fresh unsmoothed readings. Device-page and active backend polling target 100 ms without overlaps; minimum sensing period is 50 ms.
- Existing sensing, calibration, hotspot, diagnostics and buckle controls retained.

Upload `elevox-v7.2.0.bin` via **Firmware update**. Update the backend/frontend too; old single-threshold writes are rejected by v7.2. First upgrade initializes the new range defaults. Saved network/calibration preferences remain. See [setup](../../docs/V7_SETUP.md) for timing limits and protocol. Physical timing and alarms remain unverified.

# V7.1.0 buckle alarm control

Download [v7.1.0](https://github.com/debarshiputatunda/elevox/releases/tag/v7.1.0): **427,328 bytes**, below 2 MB.

- Saved buckle-alarm ON/OFF control on both the device page and Elevox website; defaults ON.
- OFF suppresses buckle-triggered alarms while preserving actual buckle readings and independent hook/manual/sensor alarms.
- Consistent, simplified device UI spacing and website monitoring layout.
- Existing sensing modes, calibration, thresholds and hotspot behavior retained.

Upload `elevox-v7.1.0.bin` through **Firmware update** at `http://192.168.4.1/update`, then reopen the device page. The website toggle needs this firmware. Build with `firmware/build_v7.sh`; see [setup](../../docs/V7_SETUP.md). Physical device behavior remains unverified.

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
