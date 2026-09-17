#!/bin/bash
# Double-click in Finder. Logs and process IDs stay beside these scripts.
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export ELEVOX_ROOT="$(cd "$(dirname "$0")" && pwd -P)"
cd "$ELEVOX_ROOT"
mkdir -p .elevox-run

finish() {
  result=$?
  rmdir "$ELEVOX_ROOT/.elevox-run/start.lock" 2>/dev/null || true
  if [ "$result" -ne 0 ]; then
    echo "Elevox did not start. See the message above and .elevox-run/*.log."
    if [ -t 0 ]; then read -r -p "Press Return to close… " _; fi
  fi
  exit "$result"
}
if ! mkdir .elevox-run/start.lock 2>/dev/null; then
  echo "Another Elevox launch is in progress. Wait for its Terminal window."
  exit 1
fi
trap finish EXIT
trap 'exit 130' INT TERM

for tool in python3 node npm; do
  command -v "$tool" >/dev/null || { echo "Install $tool before starting Elevox."; exit 1; }
done
if [ ! -f elebox_backend/.env ]; then
  echo "Configure elebox_backend/.env using .env.example and restore your MySQL database first."
  exit 1
fi

echo "Checking the Mac backend environment…"
if [ ! -x elebox_backend/.venv-macos/bin/python ]; then
  python3 -m venv elebox_backend/.venv-macos
fi
PYTHON="$ELEVOX_ROOT/elebox_backend/.venv-macos/bin/python"
BACKEND_HASH="$(shasum -a 256 elebox_backend/requirements.txt | awk '{print $1}')"
if [ "$(cat .elevox-run/backend-dependencies 2>/dev/null || true)" != "$BACKEND_HASH" ]; then
  "$PYTHON" -m pip install -r elebox_backend/requirements.txt
  printf '%s\n' "$BACKEND_HASH" > .elevox-run/backend-dependencies
fi

echo "Checking frontend dependencies…"
FRONTEND_HASH="$(shasum -a 256 elebox_frontend/package-lock.json | awk '{print $1}')-$(uname -m)"
if [ "$(cat .elevox-run/frontend-dependencies 2>/dev/null || true)" != "$FRONTEND_HASH" ] ||
   ! (cd elebox_frontend && node --input-type=module -e "await import('vite')" >/dev/null 2>&1); then
  (cd elebox_frontend && npm ci --no-audit --no-fund)
  printf '%s\n' "$FRONTEND_HASH" > .elevox-run/frontend-dependencies
fi

echo "Checking MySQL and starting the servers…"
"$PYTHON" - <<'PY'
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

root = Path(os.environ['ELEVOX_ROOT']).resolve()
run = root / '.elevox-run'
state_file = run / 'processes.json'

def listening(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=.5):
            return True
    except OSError:
        return False

def owned(pid, folder):
    result = subprocess.run(['/usr/sbin/lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'],
                            capture_output=True, text=True)
    return f'n{folder}' in result.stdout.splitlines()

if state_file.exists():
    try:
        state = json.loads(state_file.read_text())
        if all(owned(state[name], root / folder) and listening(port)
               for name, folder, port in [('backend', 'elebox_backend', 8001),
                                           ('frontend', 'elebox_frontend', 5173)]):
            print('Elevox is already running. Opening the site.')
            subprocess.run(['/usr/bin/open', 'http://127.0.0.1:5173'], check=True)
            sys.exit(0)
    except (ValueError, KeyError):
        pass

busy = [str(port) for port in (8001, 5173) if listening(port)]
if busy:
    sys.exit('Ports ' + ', '.join(busy) + ' are occupied. Run Stop Elevox.command first; '
             'if another application owns them, close that application.')

# Validate the configured database without printing credentials or changing data.
os.chdir(root / 'elebox_backend')
sys.path.insert(0, str(root / 'elebox_backend'))
try:
    from app.core.database import engine
    from sqlalchemy import text
    with engine.connect() as connection:
        connection.execute(text('SELECT box_id FROM box_details LIMIT 0'))
    engine.dispose()
except Exception as exc:
    sys.exit(f'MySQL/database check failed ({type(exc).__name__}). Start MySQL, restore '
             'your Elevox database, and check elebox_backend/.env. No database was changed.')

processes = {}
try:
    commands = {
        'backend': (root / 'elebox_backend', [sys.executable, '-m', 'uvicorn', 'app.main:app',
                    '--host', '127.0.0.1', '--port', '8001']),
        'frontend': (root / 'elebox_frontend', [shutil.which('node'),
                     str(root / 'elebox_frontend/node_modules/vite/bin/vite.js'),
                     '--host', '127.0.0.1', '--port', '5173', '--strictPort']),
    }
    for name, (cwd, command) in commands.items():
        with (run / f'{name}.log').open('w') as log:
            processes[name] = subprocess.Popen(command, cwd=cwd, stdout=log,
                stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True)
    state_file.write_text(json.dumps({name: process.pid for name, process in processes.items()}))
    for url in ['http://127.0.0.1:8001/health', 'http://127.0.0.1:5173']:
        deadline = time.monotonic() + 60
        while True:
            if any(process.poll() is not None for process in processes.values()):
                raise RuntimeError('A server exited. Inspect .elevox-run/backend.log and frontend.log.')
            try:
                with urlopen(url, timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                pass
            if time.monotonic() >= deadline:
                raise RuntimeError(f'Startup timed out waiting for {url}. See .elevox-run logs.')
            time.sleep(.5)
    subprocess.run(['/usr/bin/open', 'http://127.0.0.1:5173'], check=True)
    print('Elevox is running at http://127.0.0.1:5173')
    print('You can close this Terminal window. Double-click Stop Elevox.command to stop both servers.')
except BaseException:
    for process in processes.values():
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
    for process in processes.values():
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
    state_file.unlink(missing_ok=True)
    raise
PY
