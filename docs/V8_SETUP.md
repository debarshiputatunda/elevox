# Elevox v8.0.0: saved default Wi-Fi connection

This firmware is based on the supplied `elevox_v7_3_1_hook_case.zip`, SHA-256 `92be443035e17df3849a403b6ac0bc1c68acee96f49f02caf77beaff53dfc321`. Its sensing, hook-case classifier, calibration, range alarms and network EEPROM layout are retained. The web-app snippets in the archive are not needed for this firmware fix and were not installed into the website.

## What was blocking connection

The supplied firmware waited 60 seconds at boot, then refused or cancelled automatic router association while any hotspot client remained connected. A client could indefinitely prevent the saved default network from connecting. Separately, selecting a default profile did not restore `autoConnect` after an explicit Disconnect.

## v8 behavior

- Starts the open hotspot and begins trying the saved default after a one-second startup period plus the existing 750 ms request delay (approximately 1.75 seconds; main-loop scheduling adds time).
- Hotspot clients no longer prevent or cancel router association. The hotspot remains enabled and its settings page remains at `http://192.168.4.1/`.
- A router attempt has a 30-second timeout. Failed attempts rotate through saved profiles with 1–5 minute backoff instead of continuously scanning.
- Losing an established router connection schedules the default again after about 1.75 seconds; subsequent failures use the same bounded retries.
- **SET DEFAULT** persists the selection, enables auto-connect and queues a connection to it. **SAVE & CONNECT** and **CONNECT** also enable auto-connect.
- **DISCONNECT ROUTER** deliberately disables auto-connect and preserves saved profiles. That preference survives reboot. If the page reports auto-connect disabled, select the saved router and press SET DEFAULT once.
- EEPROM layouts and saved credentials are unchanged. Failed saves restore the previous EEPROM buffer and live configuration.
- `/wifi` exposes `retry_in_ms` and `last_attempt_profile`; the UI explains retry/disabled states.

ESP8266 AP and STA share one radio channel. Router association can move the hotspot channel and briefly interrupt a connected client. Rejoin the hotspot if necessary. Keeping AP enabled does not guarantee uninterrupted radio access during association. Router credentials and a supported 2.4 GHz network must still be available.

## Build and install

Run `firmware/build_v8.sh` using Arduino CLI with ESP8266 core 3.1.2. The credential-free build targets NodeMCU v2, 80 MHz, 4 MB flash / 2 MB filesystem, and produces `firmware/releases/elevox-v8.0.0.bin` plus its SHA-256 checksum. The script rejects binaries at or above 1,000,000 bytes, below the requested 2 MB ceiling.

Upload the binary through the firmware field at `http://192.168.4.1/update`, then reopen the page. Existing stored profiles and default selection are retained. There is no website/backend upgrade or database migration required for this fix.

Native regression tests reproduce the old hotspot-client starvation and cover default selection, boot persistence, connection loss, retry rotation/backoff, explicit disconnect, re-enabling through SET DEFAULT, empty storage, failed-save rollback and missing-AP recovery. Compilation and these simulations do not establish real RF association or physical-device reliability.
