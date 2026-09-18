#!/bin/bash
set -euo pipefail
# Reproducible credential-free OTA image. Uses the installed ESP8266 core 3.1.2.
project_root="$(cd "$(dirname "$0")/.." && pwd)"
cli="${ARDUINO_CLI:-arduino-cli}"
args=()
if [[ -n "${ARDUINO_CONFIG:-}" ]]; then args+=(--config-file "$ARDUINO_CONFIG"); fi
build_tmp="$(mktemp -d)"
trap 'rm -rf "$build_tmp"' EXIT
sketch="$build_tmp/safety_harness_esp8266_v7"
mkdir -p "$sketch" "$project_root/firmware/releases"
for src in "$project_root/firmware/safety_harness_esp8266_v7/"*.h "$project_root/firmware/safety_harness_esp8266_v7/"*.ino; do
  [[ "$(basename "$src")" == config.local.h ]] && continue
  cp "$src" "$sketch/"
done
"$cli" "${args[@]}" compile --fqbn esp8266:esp8266:nodemcuv2:xtal=80,eesz=4M2M \
  --build-path "$build_tmp/build" --warnings all "$sketch"
python3 - "$build_tmp/build/safety_harness_esp8266_v7.ino.bin" "$project_root/firmware/releases" <<'PY'
from pathlib import Path
import hashlib,sys
source=Path(sys.argv[1]);data=source.read_bytes()
# 4M2M offers approximately 1019 KiB OTA; enforce a stricter 1,000,000-byte build budget.
assert len(data)<1_000_000 and len(data)<2_000_000, f'Firmware too large: {len(data)} bytes'
output=Path(sys.argv[2])/'elevox-v7.0.0.bin'
output.write_bytes(data)
(output.parent/'elevox-v7.0.0.sha256').write_text(hashlib.sha256(data).hexdigest()+'  '+output.name+'\n')
print(f'OTA binary: {output}\nSize: {len(data)} bytes (under 2 MB)')
PY
