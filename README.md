# Elevox

Connected safety-harness monitoring: ESP8266 firmware, a FastAPI/MySQL backend, and a React dashboard with live telemetry and a 3D harness view.

## Latest firmware

[v8.0.0](https://github.com/debarshiputatunda/elevox/releases/tag/v8.0.0) is based on the supplied v7.3.1 hook-case firmware and fixes saved default Wi-Fi auto-connect while retaining the hotspot. See [v8 setup](docs/V8_SETUP.md), source in `firmware/safety_harness_esp8266_v8`, and build with `firmware/build_v8.sh`.

## Workspace

- `elebox_backend/` — REST API, device polling, WebSockets, notifications and MySQL persistence.
- `elebox_frontend/` — React/TypeScript monitoring and administration UI.
- `firmware/safety_harness_esp8266_v7/` — selectable HIGH, LOW by hook and alternating LOW sensing; see [v7 setup](docs/V7_SETUP.md).
- `firmware/safety_harness_esp8266_v6/` — HIGH-guard sensing, saved Wi-Fi profiles and two-way threshold settings; see [v6 setup](docs/V6_SETUP.md).
- `firmware/safety_harness_esp8266_v5_old_sense/` — integrated v5 firmware, protocol `elevox-v5/1`.
- `firmware/Elevox/` and other firmware folders — legacy reference versions.
- `Kicad files/` — supplied MKIII schematic/project; no routed PCB included.
- `Start Elevox.command` / `Stop Elevox.command` — double-click launch/stop on macOS.

## Run on macOS

Requires Python 3, Node.js 22.12+ and a running MySQL server. Copy `elebox_backend/.env.example` to `elebox_backend/.env`, set the database connection and a locally generated JWT signing secret. Use your existing database; do not seed it again.

For a **new empty development database only**, run `elebox_backend/migrations/001_initial_schema.sql`, then set `ELEVOX_SEED_ADMIN_PASSWORD` and optionally `ELEVOX_SEED_ADMIN_EMAIL` before running `elebox_backend/scripts/seed.py` with the backend virtual environment. The seed script is not idempotent. The second SQL migration adds notification indexes; inspect before applying to an existing database.

Double-click **Start Elevox.command**. It installs dependencies when needed, checks the database, starts the API on port 8001 and website on port 5173, and opens the default browser. Double-click **Stop Elevox.command** to stop the two servers and free their ports. MySQL stays running. Logs are in `.elevox-run/`.

For v6.2, open the hotspot page manually at **http://192.168.4.1/**; automatic captive popups are disabled. V6.2 adds optional Hand/Metal prediction calibration, independent Link Index, stream diagnostics, device naming and a saved light/dark theme. Build the OTA image with `firmware/build_v6.sh`. See [v6 setup](docs/V6_SETUP.md).

The web application retains its account login. The v5 **device dashboard and hotspot** are passwordless for this development setup; anyone on the device network can access device configuration, alarms and firmware updates.

## Flash and connect v5

Read [the v5 setup and data contract](docs/V5_SETUP.md). The first upgrade from the legacy firmware requires USB/serial flashing: the old sketch does not create a hotspot or expose OTA.

Join the open **SBox-<chip ID>** hotspot and open **http://192.168.4.1/**. The same firmware settings page is available over the hotspot and router network. Its **Router Wi-Fi** form saves the router SSID/password across restarts.

The updated v5 uses the currently working Elevox firmware pin map by default. Select the supplied schematic's mapping only after matching the actual circuit. This release does not change the circuit or calibrate the battery divider.

## Alarm and threshold behavior

**Current v7.2.1:** each hook has two inclusive alarm ranges, initially 10–1,800 and 10,000–1,000,000. Both hooks must be inside a range to trigger the hook alarm; they may match different bands. Both interfaces edit the same device-owned saved ranges. Fresh unsmoothed readings drive the alarm; display smoothing remains optional. Buckle alarms have their own saved ON/OFF control. See [v7 setup](docs/V7_SETUP.md) and [download v7.2.1](https://github.com/debarshiputatunda/elevox/releases/tag/v7.2.1).

Device-page and active backend requests now target 100 ms, with no overlaps, and the minimum sensing period is 50 ms. Measurement time and Wi-Fi still determine actual latency. Firmware and software must both be upgraded for range control.

Link Index and active guard are visible in both interfaces. Partial HIGH-guard readings and full discharge timeouts are explicitly labeled; invalid observations do not drive hook alarms.

The following describes older single-threshold firmware:

V6 also accepts threshold edits from its firmware page and synchronizes them back to MySQL with revision checks; independent website edits take priority in conflicts.

The website saves independent raw hook thresholds to MySQL. The backend sends them to integrated v5, which commits them to EEPROM and uses them while offline. The monitoring page separately shows server-save status and device confirmation. A disconnected device keeps its last confirmed limits; a new value cannot apply there until synchronization completes.

Integrated v5 handles hook alarms locally when both valid readings are `>=` their respective thresholds. Open buckles and sensor faults have separate local alarm causes. A manual trigger produces a ten-second pulse. The backend avoids duplicate automatic pulses on integrated v5, while continuing the legacy CSV firmware's existing server-triggered behavior.

Zero is a literal threshold. A fresh integrated-v5 EEPROM layout starts hook alarms unarmed until its first website synchronization. Buckle and sensor-fault monitoring still operate. Set appropriate limits and wait for **Device limits confirmed** before relying on disconnected hook operation.

## Development checks

```sh
cd elebox_backend
.venv-macos/bin/python -m pytest -q
cd ../elebox_frontend
npm test
npm run build
cd ..
c++ -std=c++11 firmware/tests/alarm_logic_test.cpp -o /tmp/elevox-alarm-test
/tmp/elevox-alarm-test
c++ -std=c++11 firmware/tests/wifi_settings_test.cpp -o /tmp/elevox-wifi-test
/tmp/elevox-wifi-test
```

See [the source review](FIRMWARE_HARDWARE_ANALYSIS.md) for the original hardware findings. It is a historical analysis, not validation of the revised firmware or assembled device. Hardware calibration, real-device reconnect/power-cycle tests and manufacturing checks remain necessary.

## Public repository

This repository combines the current frontend/backend source, firmware and schematic in a clean initial history. Local `.env` files, router credentials, database contents, logs, dependency folders and firmware binaries are excluded. Legacy firmware credentials have been moved into ignored `config.local.h` files; public defaults contain no credentials.
