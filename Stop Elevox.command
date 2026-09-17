#!/bin/bash
# Stops only this checkout's Elevox servers, including orphaned port listeners.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export ELEVOX_ROOT="$(cd "$(dirname "$0")" && pwd -P)"
cd "$ELEVOX_ROOT"
result=0
python3 - <<'PY' || result=$?
import json
import os
from pathlib import Path
import signal
import subprocess
import time

root = Path(os.environ['ELEVOX_ROOT']).resolve()
state_file = root / '.elevox-run/processes.json'

def output(command):
    return subprocess.run(command, capture_output=True, text=True).stdout.strip()

def listeners(port):
    return {int(pid) for pid in output(['/usr/sbin/lsof', '-t', '-nP',
            f'-iTCP:{port}', '-sTCP:LISTEN']).split() if pid.isdigit()}

def is_elevox(pid):
    cwd = output(['/usr/sbin/lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn']).splitlines()
    command = output(['/bin/ps', '-p', str(pid), '-o', 'command='])
    return ((f'n{root / "elebox_backend"}' in cwd and 'uvicorn app.main:app' in command)
            or (f'n{root / "elebox_frontend"}' in cwd and 'vite' in command))

def terminate(pid, sig):
    try:
        # The launcher gives each server its own group; never signal the
        # Terminal's group when cleaning up a manually launched server.
        if os.getpgid(pid) == pid:
            os.killpg(pid, sig)
        else:
            os.kill(pid, sig)
    except ProcessLookupError:
        pass

pids = set()
if state_file.exists():
    try:
        pids.update(int(pid) for pid in json.loads(state_file.read_text()).values())
    except (ValueError, TypeError):
        pass
for port in (8001, 5173):
    pids.update(listeners(port))
targets = {pid for pid in pids if is_elevox(pid)}
for pid in targets:
    terminate(pid, signal.SIGTERM)
deadline = time.monotonic() + 8
while time.monotonic() < deadline and any(is_elevox(pid) for pid in targets):
    time.sleep(.2)
for pid in targets:
    if is_elevox(pid):
        terminate(pid, signal.SIGKILL)
time.sleep(.2)
state_file.unlink(missing_ok=True)
blocked = {port: listeners(port) for port in (8001, 5173) if listeners(port)}
if blocked:
    for port, owners in blocked.items():
        print(f'Port {port} is still occupied by PID(s) {sorted(owners)}. '
              'Unrelated applications were not terminated.')
    raise SystemExit(1)
print('Elevox stopped. Ports 8001 and 5173 are free.')
print('MySQL and saved data were left running/unchanged.')
PY
if [ "$result" -ne 0 ] && [ -t 0 ]; then
  read -r -p "Press Return to close… " _
fi
exit "$result"
