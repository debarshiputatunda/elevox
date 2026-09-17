# Integrated v5 setup

## Build

Use ESP8266 Arduino core **3.1.2** and 80 MHz CPU timing. Sketch:
`firmware/safety_harness_esp8266_v5_old_sense/safety_harness_esp8266_v5_old_sense.ino`.

Router credentials can be entered directly on the device settings page after joining its hotspot; recompiling is unnecessary. Optional `config.local.h` credentials are only fallback defaults when no valid saved Wi-Fi settings exist. Give each device its own `SBOX_DEVICE_ID` when operating a fleet.

The existing local router settings have been preserved outside public source. `SBOX_SCHEMATIC_PINOUT=0` preserves the old working Elevox mapping: buzzer GPIO15, LED GPIO12, buckles GPIO13/16/14. `=1` selects the supplied schematic mapping: buzzer GPIO12, LED GPIO2, buckles GPIO13/14/16. Hook A/B remain GPIO5/4. GPIO16 still needs the correct external electrical bias; firmware cannot repair floating wiring.

Example CLI build:

```sh
arduino-cli core update-index --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
arduino-cli core install esp8266:esp8266@3.1.2 --additional-urls https://arduino.esp8266.com/stable/package_esp8266com_index.json
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2:xtal=80 firmware/safety_harness_esp8266_v5_old_sense
```

Board selection and flash-size settings must match the physical module. The NodeMCU build matches the previously supplied v5 target; choose Generic ESP8266 for a bare ESP-12 module with its actual flash parameters. Do not reuse the older `.bin` files supplied with the project: they predate these changes.

## First connection

1. Flash the new firmware over USB/serial using the correct board/port. No physical flashing is performed by this code update.
2. Join the **SBox-<chip ID>** Wi-Fi network. It has no password. If the OS saved the previous secured network, forget that network and reconnect.
3. The captive portal serves the **same full firmware settings page** as the router connection, including hotspot IP **192.168.4.1** and the router-assigned IP if connected. If the OS does not automatically open the page, visit **http://192.168.4.1/connect**. Automatic popup behavior depends on the OS; the explicit address remains available.
4. In **Router Wi-Fi**, enter the router SSID and password, then choose **Save & Connect**. Use a 2.4 GHz network; leave the password blank for an open router. Settings persist across restarts. **Disconnect Router** clears saved router credentials while keeping the hotspot enabled. The hotspot does not provide internet. Stay connected when the OS asks whether to use a network without internet.
5. Set the SBox address in the Elevox website to **192.168.4.1** if the backend Mac is on this hotspot, or use the shown router address if both backend and device are on that router network. A phone connected to the hotspot does not give a separate Mac access to it. One Mac cannot address several isolated SBox hotspots simultaneously through the same Wi-Fi adapter.
6. Save Hook A/B limits on the monitoring page and wait for **Device limits confirmed**. Power-cycle the device and confirm the same stored limits are reported before offline use.

The hotspot starts without waiting for router association. Station reconnects run alongside it; ESP8266 uses one radio, so the AP channel follows its station connection. Changing router networks may briefly disconnect hotspot clients as the shared radio changes channel. Rejoin SBox and open http://192.168.4.1/ if necessary. Incorrect router credentials do not disable the hotspot. Check the serial monitor at 115200 baud for AP configuration success and the hotspot address.

## Router configuration

`GET /wifi` reports the saved SSID, connection status, hotspot SSID/IP and router IP. It never returns the password. `POST /wifi` accepts form fields `ssid` and `password`, validates them, and returns 202 only after EEPROM commit succeeds. An empty SSID and password disconnect the router. Invalid credentials return 400; storage failure returns 500 and retains the previous settings. Connection attempts run without blocking the monitoring loop.

Router credentials occupy a separate checksummed EEPROM region starting at byte 96; alarm settings retain their existing offsets. Saved blank credentials override compiled defaults. Both `/` and `/connect` serve the self-contained settings page, with no internet assets required. Captive portal popup availability depends on the client OS.

## Protocol

`GET /data` returns JSON with `protocol: "elevox-v5/1"`. Hook values `raw1/raw2` are raw discharge-cycle measurements. `hook_a_valid/hook_b_valid` explicitly identify faults; invalid values are -1. `b1/b2/b3` are booleans with **true = locked**, which the backend normalizes to its existing **0 = locked, 1 = open** representation.

Additional fields include `threshold_a`, `threshold_b`, `hook_alarm_enabled`, `alarm` and `mode`. Alarm modes are NONE, MANUAL, HOOK, BUCKLE and SENSOR. `alarm` means a logical alarm condition; the existing buzzer switch/volume control can mute sound independently.

`POST /thresholds` uses form fields `threshold_a` and `threshold_b`, both integers from 0 through 100000. It accepts both together, checks EEPROM commit success, and returns `{"saved":true}`. Invalid input returns 400; persistence failure returns 500 and restores the previous live threshold values. Identical values do not rewrite flash. The backend retries failures with a per-device delay and confirms synchronization only after `/data` reports both stored values and enabled hook alarms.

MySQL is authoritative while the backend runs. The device dashboard displays the stored limits but does not offer a competing hook-limit editor. If the backend is disconnected, the device retains its last saved values. A database save and an EEPROM write are separate operations; the UI reports them separately.

Automatic integrated-v5 hook alarms clear with the local threshold condition. Buckle alarms clear when all buckles close; sensor alarms clear when valid sensing returns. `GET /trigger` remains a ten-second manual latch. There is no `/stop` endpoint; threshold edits do not cancel a manual pulse. The backend does not issue additional automatic pulses for this protocol.

The old CSV protocol remains supported. Original unmodified v4/v5 JSON can be read, but reports that threshold sync is unsupported; upgrade to this integrated build for passwordless control and synchronized limits.

## Device access

The device dashboard, `/config`, `/thresholds`, `/trigger`, HTTP `/update` and Arduino OTA do not require a password in this development version. The main Elevox website still uses its existing accounts. Firmware updates temporarily suspend device monitoring as in the original v5.

The standalone logger in `firmware/Elevox/safety_harness_telemetry_logger.py` already consumes the JSON hook/buckle fields; set its target address to the reachable v5 device. It does not support the old CSV firmware.
