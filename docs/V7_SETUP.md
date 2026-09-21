# V7.1.0: buckle alarm control and selectable sensing

V7 retains the v6.2 hotspot, router profiles, threshold synchronization, alarms, prediction/calibration, recording, device name/theme and diagnostics. V6 remains separately available. The active sketch is `firmware/safety_harness_esp8266_v7/safety_harness_esp8266_v7.ino`.

## Choose a sensing mode

Use **Hook sensing → Save mode** on the device page. The choice is saved across reboots.

| Mode | Other hook during measurement | Order for a completed frame | Timeout policy |
| --- | --- | --- | --- |
| V6 HIGH guard | HIGH | A 16 times, then B 16 times | All 16 must succeed per hook |
| LOW guard by hook (default) | LOW / ground | A 16 times, then B 16 times | Average successful readings; invalid only if all 16 time out |
| Alternating LOW guard | LOW / ground | A, B, A, B, repeated 16 times | Same successful-reading average |

Both LOW modes charge the measured pin HIGH for 50 microseconds, keep interrupts enabled, switch it to INPUT, and time its discharge up to 800,000 CPU cycles. Wi-Fi interrupts remain serviceable throughout the bounded timing window. At the compiled 80 MHz clock the maximum individual discharge wait is 10 ms. Guard polarity and reading order follow the supplied discharge method; it does not imply a 20 ms full frame: 32 saturated readings alone can require roughly 320 ms.

V6 HIGH mode retains its existing interrupt-enabled discharge timing. In every mode, each main-loop pass takes one individual sample, releases both pins to INPUT, and yields; HTTP, Wi-Fi, buckles and alarms are serviced between readings. A complete A/B frame is published together. LOW guard by hook differs from alternating LOW guard in sample ordering, not polarity.

The independent Link Index uses the same passive-reset coupling measurement as v6 and remains visible with prediction off. The circuit pin map and direct buckle inputs remain unchanged; the legacy mux scan described in the supplied text is not introduced. The initial EMA coefficient remains 20%, with the existing saved/on-off/adjustable setting retained. All-timeout readings invalidate the EMA instead of being blended in.

## Switching and calibration

Switching discards any incomplete frame, releases pins, clears old smoothing/prediction history and waits for new measurements. Calibration capture must finish or be canceled before switching. A partially completed, idle wizard is canceled on a mode change.

Each mode has its own optional saved Hand/Metal calibration. Existing v6 calibration belongs only to V6 HIGH guard. New LOW modes start without calibration and can use the same Free → A → B five-second wizard. Returning to a mode restores its saved reference. Clearing calibration affects only the selected mode. Calibration still does not modify hook alarm thresholds.

**Numeric alarm thresholds stay unchanged when switching modes.** Readings can change with guard polarity and ordering; check those limits against measurements in the selected mode. Website synchronization continues to apply its saved thresholds. A successful mode save confirms storage, not suitability of existing limits. Failed saves retain the previous active mode and EEPROM buffer.

Prediction tuning controls outside the guided calibration (baseline, link limits, delta, gain) retain their existing shared settings. No classification proves mechanical fastening or reliably separates touching hooks from hooks on the same conductive scaffold.

## Telemetry, CSV and storage

The protocol remains `elevox-v5/1`; `firmware` is `v7.1.0`. New fields are `sensing_mode` (0/1/2), `sensing_name` (`v6-high` / `low-batch` / `low-alternating`) and `sensing_revision` (increments on runtime mode changes). `guard` reports HIGH or LOW. Timeout counters remain visible even when a LOW-mode partial batch yields a valid mean.

POST `/sensing` accepts one form field `mode=0`, `1`, or `2`. Invalid values return 400, active calibration returns 409, failed persistence returns 500. Success returns `{ "saved": true, "mode": 1 }` for the default mode. The existing device page exposes these controls; no separate website/backend change is required by the compatible data contract.

CSV rows include mode provenance so recordings can contain mode comparisons without silently mixing them. The chart clears on a mode transition; existing recorded rows remain. Stream health and diagnostics remain available, with active mode included in diagnostics.

EEPROM uses the existing 2048-byte allocation. Alarm settings, network profiles and device preferences keep their locations. Mode selection uses byte 1216; calibration profiles occupy bytes 1152 (HIGH, compatible with v6), 1472 (LOW by hook) and 1536 (alternating LOW). Each calibration is 48 bytes. The mode record and calibration records are validated before use.

## Build and install

Run `firmware/build_v7.sh` with ESP8266 core 3.1.2. It builds a credential-free NodeMCU v2 image at 80 MHz, 4 MB flash / 2 MB filesystem, into `firmware/releases/elevox-v7.1.0.bin` and a SHA-256 file. The script rejects images at or above 1,000,000 bytes, below the requested 2 MB ceiling.

Upload the `.bin` through **Firmware update** at `http://192.168.4.1/update`, using the firmware field. The currently flashed device still needs enough OTA free space. Saved network/name/theme/threshold settings remain. Open the hotspot page manually after reboot, select the desired mode, then verify readings, thresholds and optional calibration.

Native GPIO and storage simulations plus browser checks cover digital sequencing and configuration behavior. They do not validate the analog circuit, interrupt timing under real RF traffic, or physical hotspot reliability. A real-device comparison is required before judging which sensing mode works best on the harness.

## Hotspot reliability update (v7.0.1)

V7.0.0 masked interrupts for up to 10 ms per LOW measurement. V7.0.1 removes that mask, preserving grounding and sample order while allowing Wi-Fi interrupts. This addresses a source-level Wi-Fi starvation risk described by the [ESP8266 core](https://arduino-esp8266.readthedocs.io/en/3.1.2/reference.html#interrupts). LOW readings can include interrupt jitter. Their calibration slots are new, so old LOW calibrations are not applied to the changed timing; recalibrate LOW modes if using prediction. HIGH calibration, alarm thresholds and router profiles remain.

Boot starts the hotspot with the station interface disabled. Automatic router association waits 60 seconds, pauses while an AP client is connected, and waits a further 120 seconds after the last observed client. A queued automatic attempt is rechecked before execution, and a running automatic attempt is stopped if an AP client joins. The station interface is disabled between failed attempts instead of continuing to compete with the hotspot. Explicit Connect/Save & Connect still work immediately and can briefly change the shared radio channel. Disconnect Router saves hotspot-only operation while retaining profiles.

The ESP8266 has one radio channel shared by the hotspot and router connection; see the [core AP documentation](https://arduino-esp8266.readthedocs.io/en/3.1.2/esp8266wifi/soft-access-point-class.html#softap). The update reduces automatic connection interference; it cannot promise simultaneous uninterrupted AP service during every explicit router association.

Diagnostics now include Wi-Fi mode/channel and counters for hotspot starts, router attempts and automatic-attempt cancellations, alongside uptime and reset reason. These help distinguish rebooting from router/channel activity if the physical symptom continues. Firmware compilation and simulated tests are not a physical RF-stability test.

If the old page will not remain reachable for an OTA upload, install the update over USB/serial. After reboot, join the renamed SBox network, remain connected despite its no-internet status, and manually open **http://192.168.4.1/** (HTTP).

## Buckle alarm control (v7.1.0)

Use **Buckle alarms** in the device page's Buckle Status section or the website's Hardware Integrity panel. The setting defaults ON and is saved on the device across reboots. OFF prevents open buckles from triggering the device alarm, website buckle siren, and buckle-open notifications. Actual OPEN/CLOSED readings remain visible; hook, sensor and manual alarms remain independent. Re-enabling while a buckle is open restores the buckle alarm.

The website requires device-management permission and an online device with compatible firmware. A save is confirmed only after the device acknowledges persistence; offline, unsupported and failed writes show an error instead of claiming success. Old firmware retains its existing behavior until upgraded.

Device POST `/buckle-alarm` accepts form `enabled=0` or `enabled=1` and returns `{ "saved": true, "enabled": false }` when disabling succeeds. Website PATCH `/sboxes/{id}/buckle-alarm` accepts JSON `{ "enabled": false }`. Telemetry and diagnostics expose `buckle_alarm_enabled`. A validated 12-byte EEPROM record at offset 1664 defaults ON when absent or corrupt. No database migration is required.

The device UI uses consistent spacing, simple borders and warm light/dark colors without external assets. Source tests, mocked browser checks and compilation pass; physical alarm behavior and RF stability still require device validation.
