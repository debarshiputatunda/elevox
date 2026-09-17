# V6.2: HIGH-guard firmware, calibration and stream diagnostics

Sketch: `firmware/safety_harness_esp8266_v6/safety_harness_esp8266_v6.ino`.
V5 is retained unchanged. V6 starts from the latest integrated v5, including its open SBox hotspot, full device settings page, persistent router credentials, alarm/threshold synchronization, OTA and existing circuit pin map.

## Sensing sequence

| Measurement | Hook A | Hook B |
| --- | --- | --- |
| A discharge | Charge HIGH, then INPUT; time natural decay | OUTPUT HIGH |
| B discharge | OUTPUT HIGH | Charge HIGH, then INPUT; time natural decay |
| Between readings | INPUT | INPUT |
| Coupling reset | INPUT; wait for natural LOW | INPUT; wait for natural LOW |
| Coupling rise | OUTPUT HIGH | INPUT; time rise |

All hook output transitions preload HIGH before enabling OUTPUT. No sensing operation drives a hook LOW. The former guard toggle is fixed HIGH and `/config?guard=...` rejects changes. GPIO usage follows the [ESP8266 core digital I/O interface](https://arduino-esp8266.readthedocs.io/en/3.0.0/reference.html); the installed 3.1.2 implementation was also checked for HIGH latch preloading.

Sixteen discharge samples are taken per hook. Any timeout makes the batch invalid (`raw1` or `raw2` = -1); timeout counts remain available as `a_timeouts` and `b_timeouts`. This avoids averaging away saturation caused by a hook being held HIGH. As in v5, invalid hook sensing reports SENSOR mode, unless an open buckle takes priority.

The mutual measurement no longer grounds both hooks first. It waits up to 12000 CPU cycles for both INPUT pins to become LOW naturally, then drives A HIGH and times B. If passive reset fails, `mutual_valid=false` and classification is UNKNOWN. A valid reset with no subsequent rise returns the ceiling, indicating no observed rise within that window. Twelve valid samples form the median. Mutual validity is diagnostic and does not independently trigger a new alarm.

## What the experiment can establish

The page reports STRONG LINK, WEAK LINK or electrical loading; none proves mechanical fastening. Two hooks touching and two hooks attached to the same conductive scaffold can present the same electrical path. HIGH guarding may produce different decay/timeout patterns in the actual circuit, but reliable separation has not been demonstrated. It may require an additional independent measurement or sensor if the recorded cases overlap.

The prior LOW-guard calibration ranges do not apply. Default baseline/link limits are starting values only. V6 uses a new alarm-configuration EEPROM magic so it does not reinterpret v5 local baselines and armed limits. The original single-network credentials migrate into the new five-profile store at EEPROM byte 256; threshold/edit metadata stays below byte 96. Other local alarm settings start at defaults on the first upgrade/downgrade between these versions.

**The backend can immediately sync existing database thresholds to v6.** The new EEPROM magic is not a calibration lock. Stop backend polling while collecting initial measurements, then set suitable website thresholds before reconnecting for alarm tests. A saved threshold is not evidence of calibration.

## Bench comparison

1. Flash v6 at 80 MHz using the board/flash parameters matching the module. Join the open SBox hotspot and visit http://192.168.4.1/.
2. Record labeled cases: both free, A touching the scaffold, B touching it, hooks touching each other, and both attached to the same scaffold. Repeat with representative scaffold grounding/contact conditions.
3. The firmware page's CSV export includes hook values, validity, mutual validity and timeout counts. Compare repeatability and overlap, including fully and partly saturated batches. A timeout is not proof of fastening.
4. Recalibrate baselines and classifier limits from the new measurements. If cases overlap, retain ambiguous labels rather than assigning a confident fastening state.
5. Reconnect the backend with suitable limits, confirm both device limits, and test hook, buckle, sensor and manual alarm paths and persistence after restart.

`protocol` remains `elevox-v5/1` because its hook/buckle/alarm/threshold contract is compatible; `firmware` identifies `v6.2.0`. Deploy the matching backend update for revision-guarded two-way threshold edits; older backends cannot acknowledge this new threshold endpoint. Additional diagnostic fields are visible in the firmware page and its CSV; they are not added to the main website's database.

## Hotspot and network profiles

Join the passwordless SBox hotspot, then **manually open http://192.168.4.1/**. Automatic captive browser opening is intentionally disabled. OS connectivity probes receive success responses instead of repeated redirects. The hotspot does not route internet; stay connected when your OS reports no internet.

Save up to five SSID/password pairs. Selecting a profile shows its saved password, as requested. Save & Connect persists then connects; Set Default chooses the first network for startup; Connect explicitly retries a selected profile; Delete removes it; Disconnect Router retains profiles and disables automatic router connections until Connect/Save & Connect is used.

Each attempt has a 30-second window, followed by increasing 1–5 minute backoff. Other saved networks are tried after failures. Automatic attempts pause while a hotspot client is connected; explicit Connect works immediately. This avoids continuous channel scans while configuring. ESP8266 has one radio, so an explicit connection to a router can still change its AP channel and briefly interrupt clients. Rejoin the hotspot if that happens. The AP is recreated only if its mode/IP indicates it has stopped.

Single-hook measurements keep interrupts enabled and acquire one discharge sample per main-loop iteration (at most one 10 ms discharge wait). Both pins return to INPUT between samples; HTTP, Wi-Fi and alarms are serviced between them. Completed A/B frames are published together. Timing includes interrupt jitter, so validate calibration again. Prediction OFF collapses prediction and its calibration/classifier controls. Link Index continues measuring and stays visible; raw hook and buckle alarms continue.

## Threshold editing and conflicts

Both firmware and website expose numeric Hook A/B boxes. Firmware edits save immediately and carry a persistent revision, pending flag and last acknowledged server baseline. Backend polling imports an edit only if MySQL still matches that baseline, then acknowledges it with `expected_revision`. Stale posts receive HTTP 409; failed storage restores live values and the EEPROM RAM buffer.

If the website independently changed its values, the database takes priority. Establish one backend synchronization before expecting firmware edits to propagate to the database; without a server baseline the database wins on first connection. Repeated device edits are protected while a poller remains active, even if an acknowledgement fails. After a backend restart, an unresolved ambiguous conflict favors the database. Firmware drafts survive polling; Refresh explicitly reloads current values after a conflict.

The metadata fields are `threshold_edit_revision`, `threshold_edit_pending`, `threshold_base_a`, `threshold_base_b`, and `threshold_base_valid`. Backend posts include `expected_revision`; firmware-page posts also include `source=device`. Network and tuning save failures also restore previous settings rather than accidentally committing them during a later save.

## OTA binary

Run `firmware/build_v6.sh` with ESP8266 core 3.1.2 installed. It stages source without `config.local.h`, builds NodeMCU v2 at 80 MHz with the 4 MB / 2 MB filesystem layout, and produces `firmware/releases/elevox-v6.2.0.bin` plus a SHA-256 file. It rejects binaries at or above 1,000,000 bytes, stricter than the requested 2 MB cap. This binary contains no compiled router credentials; saved EEPROM profiles are retained.

Upload the `.bin` via **http://192.168.4.1/update** (firmware, not filesystem), or the device's router address. Actual OTA capacity depends on the currently flashed layout: the device page reports `ota_max_bytes`, calculated using the same free-space rule as the ESP8266 HTTP updater. Being below 2 MB alone does not guarantee compatibility with every flash layout. See the [core OTA requirements](https://arduino-esp8266.readthedocs.io/en/3.1.2/ota_updates/readme.html#ota-basic-requirements). USB flashing may be needed if the old firmware is unreachable or its update space is insufficient.

## Build and checks

```sh
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2:xtal=80 firmware/safety_harness_esp8266_v6
c++ -std=c++11 firmware/tests/v6_sensing_test.cpp -o /tmp/elevox-v6-test
/tmp/elevox-v6-test
```

The GPIO simulation tests execute the actual sensing routines and reject enabling any LOW output, test both hook directions, full/partial saturation, successful coupling, no rise and passive-reset failure. They do not model the analog circuit. Physical flashing and distinction between real hook/scaffold cases have not been verified.

## Optional prediction calibration

Choose **Hand** or **Metal**, then explicitly start each five-second capture: both hooks free, Hook A held in the hand/touching the reference metal, and Hook B held/touching it. Keep the other hook free. The device controls timing, so browser refreshes do not restart a capture. A baseline and separated, sufficiently stable contact samples are required; failed steps can be retried. The old saved profile remains active until all three steps succeed and storage succeeds. Clear calibration returns to the default predictor. Calibration is optional, persists across reboots, and does not change alarm thresholds or their smoothing state.

Calibrated hook labels mean similarity to the chosen reference, not proof of material identity or mechanical fastening. Ambiguous values produce UNKNOWN. Link measurements remain independent of prediction. Changing physical conditions can require recalibration.

## Device settings, recording and diagnostics

Device settings saves the light/dark theme for all browsers. Rename accepts 1–32 letters, digits, spaces, hyphens or underscores, without edge spaces. The hotspot adopts that name after about two seconds; reconnect to its new name. The backend device ID and mDNS hostname remain stable. The redundant Connection addresses link was removed; actual hotspot/router addresses remain visible in network status. Firmware update is a button opening `/update`.

The preference record starts at EEPROM byte 1024 and the versioned calibration record at 1152, within a 2048-byte emulated EEPROM. Existing Wi-Fi and alarm/threshold regions remain unchanged. Failed commits retain the previous live settings.

The stream bar distinguishes recent HTTP responses from new sensor frames using sequence, sample age and uptime. Identical numeric readings still advance the sample counter and chart. A responding page with a stuck sample sequence reports SENSOR SAMPLES STALE; missing responses report RESPONSE STALE. Download diagnostics includes sample timing, validity, heap and connection status without saved router names/passwords. This makes a future pause diagnosable; simulated checks do not establish the cause of the reported physical-device pause.

CSV recording includes fresh sample sequence/uptime, prediction enabled/state, calibration flag and reference mode alongside the manual label. **Mixed usage** is available as a label. CSV is stored in browser memory, with a visible 10,000-row limit; download before reloading or leaving the page. It records newly observed frames rather than every device acquisition. Polling continues while recording in a background tab, but the browser/OS can throttle or suspend tabs; keep the page foreground for consistent capture.
