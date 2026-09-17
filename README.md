# Elevox

Connected safety-harness monitoring: ESP8266 firmware, a FastAPI/MySQL backend, and a React dashboard with live telemetry and a 3D harness view.

## Workspace

- `elebox_backend/` — REST API, device polling, WebSockets, notifications and MySQL persistence.
- `elebox_frontend/` — React/TypeScript monitoring and administration UI.
- `firmware/safety_harness_esp8266_v5_old_sense/` — integrated v5 firmware, protocol `elevox-v5/1`.
- `firmware/Elevox/` and other firmware folders — legacy reference versions.
- `Kicad files/` — supplied MKIII schematic/project; no routed PCB included.
- `Start Elevox.command` / `Stop Elevox.command` — double-click launch/stop on macOS.

## Run on macOS

Requires Python 3, Node.js 22.12+ and a running MySQL server. Copy `elebox_backend/.env.example` to `elebox_backend/.env`, set the database connection and a locally generated JWT signing secret. Use your existing database; do not seed it again.

For a **new empty development database only**, run `elebox_backend/migrations/001_initial_schema.sql`, then set `ELEVOX_SEED_ADMIN_PASSWORD` and optionally `ELEVOX_SEED_ADMIN_EMAIL` before running `elebox_backend/scripts/seed.py` with the backend virtual environment. The seed script is not idempotent. The second SQL migration adds notification indexes; inspect before applying to an existing database.

Double-click **Start Elevox.command**. It installs dependencies when needed, checks the database, starts the API on port 8001 and website on port 5173, and opens the default browser. Double-click **Stop Elevox.command** to stop the two servers and free their ports. MySQL stays running. Logs are in `.elevox-run/`.

The web application retains its account login. The v5 **device dashboard and hotspot** are passwordless for this development setup; anyone on the device network can access device configuration, alarms and firmware updates.

## Flash and connect v5

Read [the v5 setup and data contract](docs/V5_SETUP.md). The first upgrade from the legacy firmware requires USB/serial flashing: the old sketch does not create a hotspot or expose OTA.

The updated v5 uses the currently working Elevox firmware pin map by default. Select the supplied schematic's mapping only after matching the actual circuit. This release does not change the circuit or calibrate the battery divider.

## Alarm and threshold behavior

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
```

See [the source review](FIRMWARE_HARDWARE_ANALYSIS.md) for the original hardware findings. It is a historical analysis, not validation of the revised firmware or assembled device. Hardware calibration, real-device reconnect/power-cycle tests and manufacturing checks remain necessary.

## Public repository

This repository combines the current frontend/backend source, firmware and schematic in a clean initial history. Local `.env` files, router credentials, database contents, logs, dependency folders and firmware binaries are excluded. Legacy firmware credentials have been moved into ignored `config.local.h` files; public defaults contain no credentials.
