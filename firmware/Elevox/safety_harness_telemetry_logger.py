import requests
import time
import csv
import os
import threading
from datetime import datetime, timezone, timedelta
 
# ── CONFIGURATION ─────────────────────────────────────────────────────────────
# Update this with the IP printed in your Serial Monitor!
ESP_IP    = "http://192.168.0.126/data" 
FILE_NAME = "harness_continuous_log.csv"
POLL_RATE = 0.2   # seconds between requests (5 Hz)
 
# IST = UTC + 5:30
IST = timezone(timedelta(hours=5, minutes=30))
 
# ── LOGGING CONTROL ───────────────────────────────────────────────────────────
logging_active = threading.Event()
logging_active.set() 
 
# ── OBJECT TYPE ───────────────────────────────────────────────────────────────
OBJECT_OPTIONS = ["Metal", "Human Touch", "Free"]
 
current_object = None
object_lock    = threading.Lock()
sl_no = 0
 
def next_sl():
    global sl_no
    sl_no += 1
    return sl_no
 
def get_ist_timestamp():
    return datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
 
# ── UI MENUS ──────────────────────────────────────────────────────────────────
def print_object_menu(current=None):
    print("\n  ┌─ Change Object Type ──────────────────┐")
    for i, opt in enumerate(OBJECT_OPTIONS):
        marker = "  ◄ active" if opt == current else ""
        print(f"  │  [{i + 1}] {opt}{marker}")
    print("  │  [Enter] Keep current")
    print("  └───────────────────────────────────────┘")
    print("  Your choice: ", end="", flush=True)
 
def select_object_type_startup():
    print("  ┌─ Select Starting Object Type ─────────┐")
    for i, opt in enumerate(OBJECT_OPTIONS):
        print(f"  │  [{i + 1}] {opt}")
    print("  └───────────────────────────────────────┘")
    while True:
        print("  Your choice (1/2/3): ", end="", flush=True)
        try:
            raw = input().strip()
            choice = int(raw)
            if 1 <= choice <= 3:
                selected = OBJECT_OPTIONS[choice - 1]
                print(f"\n  ✔  Object type set to: '{selected}'\n")
                return selected
            else:
                print("  ✘  Please enter 1, 2, or 3.")
        except ValueError:
            print("  ✘  Invalid – enter a number (1, 2 or 3).")
 
# ── INPUT THREAD ──────────────────────────────────────────────────────────────
def input_listener():
    global current_object
    while True:
        try:
            raw = input()
        except EOFError:
            break
 
        if raw.strip().lower() in ("c", "change", "switch"):
            logging_active.clear()
            print("\n  ⏸  Logging Paused. Waiting for new object selection...")
            with object_lock:
                old = current_object
            print_object_menu(current=old)
 
            while True:
                try:
                    raw2 = input().strip()
                    if raw2 == "": 
                        print(f"  Keeping '{old}'.")
                        break
                    choice = int(raw2)
                    if 1 <= choice <= 3:
                        new_obj = OBJECT_OPTIONS[choice - 1]
                        with object_lock:
                            current_object = new_obj
                        print(f"\n  ✔  Switched to: '{new_obj}'")
                        break
                    else:
                        print("  ✘  Enter 1, 2, 3, or press Enter to keep. Choice: ", end="", flush=True)
                except ValueError:
                    print("  ✘  Invalid – enter a number. Choice: ", end="", flush=True)
            
            print("  ▶  Logging Resumed.\n")
            logging_active.set()
 
# ── CSV SETUP ─────────────────────────────────────────────────────────────────
def init_csv():
    global sl_no
    file_exists = os.path.isfile(FILE_NAME) and os.path.getsize(FILE_NAME) > 0
    if not file_exists:
        with open(FILE_NAME, mode='w', newline='') as f:
            csv.writer(f).writerow([
                "Sl. No", "Timestamp (IST)", "Object", "",
                "Hook A value", "Hook B value", "Buckle 1", "Buckle 2", "Buckle 3"
            ])
        print(f"  Created new log file: {FILE_NAME}")
    else:
        with open(FILE_NAME, mode='r', newline='') as f:
            existing = sum(1 for _ in csv.reader(f)) - 1
        sl_no = max(existing, 0)
        print(f"  Appending to: {FILE_NAME}  (resuming from Sl. No {sl_no + 1})")
 
# ── MAIN ──────────────────────────────────────────────────────────────────────
print("=" * 70)
print("        Industrial Safety Harness Telemetry Logger v2")
print("=" * 70)
print(f"  ESP8266 target : {ESP_IP}")
print(f"  Output file    : {FILE_NAME}")
print("  Press Ctrl+C to stop.\n")
 
current_object = select_object_type_startup()
 
t = threading.Thread(target=input_listener, daemon=True)
t.start()
init_csv()
 
print("\n  Logging started!  Type  c  + Enter  anytime to change Object type.\n")
 
def b_str(state):
    return "ATTACHED" if state else "OPEN"
 
try:
    while True:
        logging_active.wait()
        try:
            response = requests.get(ESP_IP, timeout=2)
            if response.status_code == 200:
                # Parse JSON data from ESP
                data = response.json()
                
                # Extract values
                hook_a = data.get("raw1", 0)
                hook_b = data.get("raw2", 0)
                b1 = data.get("b1", False)
                b2 = data.get("b2", False)
                b3 = data.get("b3", False)
 
                with object_lock:
                    obj = current_object
 
                row = [
                    next_sl(), get_ist_timestamp(), obj, "",
                    hook_a, hook_b, b1, b2, b3
                ]
 
                try:
                    with open(FILE_NAME, mode='a', newline='') as f:
                        csv.writer(f).writerow(row)
                    
                    # Dashboard Console Print
                    print(f"  [{row[0]:>5}] {row[2]:<12} | HookA: {hook_a:<6} HookB: {hook_b:<6} | BUCKLES: [1: {b_str(b1)}] [2: {b_str(b2)}] [3: {b_str(b3)}]")
                    
                except PermissionError:
                    print(f"  ⚠  Cannot write to '{FILE_NAME}'. Close Excel to resume saving.")
 
        except requests.exceptions.RequestException:
            print(f"  ⚠  Connection error – retrying {ESP_IP} ...")
        except ValueError:
            print("  ⚠  JSON parsing error from ESP8266.")
 
        time.sleep(POLL_RATE)
 
except KeyboardInterrupt:
    print("\n\n  Logging stopped. File saved.\n")
 