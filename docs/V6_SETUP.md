# V6: HIGH-guard sensing experiment

Sketch: `firmware/safety_harness_esp8266_v6/safety_harness_esp8266_v6.ino`.
V5 is retained unchanged. V6 starts from the latest integrated v5, including its open SBox hotspot, full captive settings page, persistent router credentials, alarm/threshold synchronization, OTA and existing circuit pin map.

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

The prior LOW-guard calibration ranges do not apply. Default baseline/link limits are starting values only. V6 uses a new alarm-configuration EEPROM magic so it does not reinterpret v5 local baselines and armed limits. Router credentials keep their existing EEPROM region. Other local alarm settings start at defaults on the first upgrade/downgrade between these versions.

**The backend can immediately sync existing database thresholds to v6.** The new EEPROM magic is not a calibration lock. Stop backend polling while collecting initial measurements, then set suitable website thresholds before reconnecting for alarm tests. A saved threshold is not evidence of calibration.

## Bench comparison

1. Flash v6 at 80 MHz using the board/flash parameters matching the module. Join the open SBox hotspot and visit http://192.168.4.1/.
2. Record labeled cases: both free, A touching the scaffold, B touching it, hooks touching each other, and both attached to the same scaffold. Repeat with representative scaffold grounding/contact conditions.
3. The firmware page's CSV export includes hook values, validity, mutual validity and timeout counts. Compare repeatability and overlap, including fully and partly saturated batches. A timeout is not proof of fastening.
4. Recalibrate baselines and classifier limits from the new measurements. If cases overlap, retain ambiguous labels rather than assigning a confident fastening state.
5. Reconnect the backend with suitable limits, confirm both device limits, and test hook, buckle, sensor and manual alarm paths and persistence after restart.

`protocol` remains `elevox-v5/1` because its hook/buckle/alarm/threshold contract is compatible; `firmware` identifies `v6-high-guard`. No backend parser migration is needed. Additional diagnostic fields are visible in the firmware page and its CSV; they are not added to the main website's database.

## Build and checks

```sh
arduino-cli compile --fqbn esp8266:esp8266:nodemcuv2:xtal=80 firmware/safety_harness_esp8266_v6
c++ -std=c++11 firmware/tests/v6_sensing_test.cpp -o /tmp/elevox-v6-test
/tmp/elevox-v6-test
```

The GPIO simulation tests execute the actual sensing routines and reject enabling any LOW output, test both hook directions, full/partial saturation, successful coupling, no rise and passive-reset failure. They do not model the analog circuit. Physical flashing and distinction between real hook/scaffold cases have not been verified.
