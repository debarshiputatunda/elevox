# V6.2.0 OTA image

Download the binary and checksum from the [v6.2.0 release](https://github.com/debarshiputatunda/elevox/releases/tag/v6.2.0), or run `firmware/build_v6.sh` to generate them locally.

- Binary: `elevox-v6.2.0.bin`, **418576 bytes** (about 409 KiB).
- Target: ESP8266 NodeMCU v2, 80 MHz, 4 MB flash / 2 MB filesystem, core 3.1.2.
- No local router credentials compiled in; existing EEPROM settings migrate or remain preserved.
- Upload through the firmware field at `http://192.168.4.1/update`, or the device's router address.
- After reboot, open `http://192.168.4.1/` manually. Captive popups are disabled.

OTA also requires enough free update space on the currently flashed device. The new settings page displays that capacity. The physical flash and RF connection have not been tested by this release's automated checks. See [setup and behavior](../../docs/V6_SETUP.md).
