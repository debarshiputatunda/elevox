#!/usr/bin/env python3
"""
Local telemetry dashboard server for ESP8266 (WebSocket push).

- Browser connects via WebSocket for live telemetry (no polling).
- Python polls ESP8266 over HTTP in the background and broadcasts to clients.
- ESP firmware stays unchanged (/data, /trigger).

Install: pip install websockets
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import error, request
from urllib.parse import urlparse
import argparse
import asyncio
import json
import socket
import threading
import time
from typing import Optional, Set

try:
    import websockets
    from websockets.server import WebSocketServerProtocol
except ImportError as exc:
    raise SystemExit("Missing dependency. Install with: pip install websockets") from exc


DASHBOARD_HTML = r"""<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harness Telemetry Command</title>
  <style>
    :root {
      --bg: #e0f2fe;
      --panel: #ffffff;
      --text: #0f172a;
      --subtext: #475569;
      --accent: #2563eb;
      --safe: #10b981;
      --danger: #ef4444;
      --warn: #f59e0b;
      --border: #cbd5e1;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 20px;
      transition: box-shadow 0.3s;
      height: 100vh;
      overflow-y: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1500px;
      margin: 0 auto 15px auto;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--border);
    }
    .title-area h1 {
      margin: 0 0 5px 0;
      font-size: 1.6rem;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--text);
    }
    .status-badge {
      display: flex;
      align-items: center;
      font-size: 0.85rem;
      color: var(--subtext);
      font-weight: 700;
      letter-spacing: 1px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--safe);
      margin-right: 8px;
      box-shadow: 0 0 8px var(--safe);
      animation: pulseDot 2s infinite;
    }
    .dot.offline {
      background: var(--danger);
      box-shadow: 0 0 8px var(--danger);
      animation: none;
    }
    .dashboard {
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
      max-width: 1500px;
      margin: 0 auto;
      align-items: stretch;
    }
    @media (min-width: 1024px) {
      .dashboard { grid-template-columns: repeat(3, 1fr); }
    }
    .panel {
      background: var(--panel);
      padding: 20px;
      border-radius: 10px;
      border: 1px solid var(--border);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      transition: 0.3s;
    }
    .panel-title {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--subtext);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin: 0 0 15px 0;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .slider-grid { display: grid; gap: 8px; margin-bottom: 20px; }
    .slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .slider-row label {
      font-size: 0.75rem;
      font-weight: bold;
      color: var(--subtext);
      text-transform: uppercase;
      white-space: nowrap;
      width: 65px;
    }
    input[type=range] { flex-grow: 1; accent-color: var(--accent); }
    .thresh-val {
      font-family: monospace;
      font-size: 1.1rem;
      font-weight: bold;
      color: var(--accent);
      min-width: 50px;
      text-align: right;
    }
    .hook-row {
      margin-bottom: 20px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .hook-header {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      margin-bottom: 8px;
      font-size: 1.1rem;
    }
    .hook-val { font-family: "Courier New", monospace; font-size: 1.4rem; font-weight: bold; }
    .bar-label {
      font-size: 0.65rem;
      font-weight: bold;
      color: var(--subtext);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }
    .bar-wrapper {
      position: relative;
      width: 100%;
      background: #1e293b;
      border-radius: 4px;
      height: 12px;
      overflow: hidden;
      margin-bottom: 8px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
    }
    .bar-fill { height: 100%; width: 0%; transition: width 0.1s linear, background-color 0.1s linear; }
    .peak-marker { position: absolute; top: 0; bottom: 0; width: 2px; background: white; z-index: 10; transition: left 0.1s; }
    .panel.alerting { border-color: var(--danger); box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); animation: subtleFlash 1s infinite; }
    .alert-text { color: var(--danger); font-weight: bold; animation: pulseDot 1s infinite; }
    .buckle-grid { display: grid; gap: 10px; margin-bottom: auto; }
    .buckle-card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .b-label { font-size: 0.85rem; font-weight: 800; color: var(--subtext); text-transform: uppercase; letter-spacing: 1px; }
    .badge { padding: 8px 16px; border-radius: 4px; font-size: 0.9rem; font-weight: bold; letter-spacing: 1px; }
    .bg-safe { background-color: rgba(16, 185, 129, 0.15); color: var(--safe); border: 1px solid var(--safe); }
    .bg-danger { background-color: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
    .ctrl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
    button {
      padding: 14px;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
      transition: 0.2s;
      color: white;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: inherit;
    }
    button:active { transform: scale(0.97); }
    .btn-full { width: 100%; margin-top: 10px; }
    #recordBtn { background: var(--accent); }
    #recordBtn.recording { background: var(--safe); animation: flash 1s infinite; }
    #downloadBtn { background: var(--subtext); display: none; }
    #safetyBtn { background: #f1f5f9; color: var(--text); border: 2px solid var(--border); }
    #safetyBtn.active { background: var(--warn); color: white; border-color: var(--warn); box-shadow: 0 0 15px rgba(245, 158, 11, 0.4); }
    #alarmBtn { background: #f1f5f9; color: var(--text); border: 2px solid var(--border); }
    #alarmBtn.active { background: var(--danger); color: white; border-color: var(--danger); pointer-events: none; }
    .console-box {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 15px;
      flex-grow: 1;
      min-height: 200px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--subtext);
      display: flex;
      flex-direction: column;
    }
    .console-entry { padding: 4px 0; border-bottom: 1px solid #e2e8f0; }
    .console-time { color: var(--accent); margin-right: 10px; font-weight: bold; }
    .log-alert { color: var(--warn); font-weight: bold; }
    .log-danger { color: var(--danger); font-weight: bold; }
    .footer { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--subtext); margin-top: 15px; font-weight: 800; }
    .btn-small {
      padding: 6px 10px;
      font-size: 0.75rem;
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--subtext);
      border-radius: 4px;
    }
    @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; box-shadow: 0 0 15px var(--danger); } }
    @keyframes subtleFlash { 0%, 100% { background-color: var(--panel); } 50% { background-color: #fee2e2; } }
    @keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.6; } }
    body.alarm-red { background-color: #fecaca; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-area">
      <h1>Telemetry Command</h1>
      <div class="status-badge">
        <div id="linkDot" class="dot"></div>
        <span id="linkText">SYSTEM LIVE</span>
      </div>
    </div>
    <button class="btn-small" onclick="toggleFullScreen()">FULLSCREEN</button>
  </div>
  <div class="dashboard">
    <div id="sensorPanel" class="panel">
      <div class="panel-title">
        <span>Capacitive Load Sensors</span>
        <span id="sensorWarning" class="alert-text" style="display:none;">LIMIT EXCEEDED</span>
      </div>
      <div class="slider-grid">
        <div class="slider-row">
          <label>Hook A</label>
          <input type="range" id="threshSliderA" min="2500" max="15000" step="50" value="3870" oninput="updateThresh('A', this.value)">
          <span id="threshValA" class="thresh-val">3870</span>
        </div>
        <div class="slider-row">
          <label>Hook B</label>
          <input type="range" id="threshSliderB" min="2500" max="15000" step="50" value="3870" oninput="updateThresh('B', this.value)">
          <span id="threshValB" class="thresh-val">3870</span>
        </div>
      </div>
      <div class="hook-row">
        <div class="hook-header"><span style="color:var(--text);">HOOK A</span><span id="valA" class="hook-val">--</span></div>
        <div class="bar-label"><span>Fine Res (2.5k - 4.5k)</span></div>
        <div class="bar-wrapper"><div id="peakA1" class="peak-marker"></div><div id="barA1" class="bar-fill"></div></div>
        <div class="bar-label" style="margin-top:8px;"><span>Overload (4.5k - 40k)</span></div>
        <div class="bar-wrapper"><div id="peakA2" class="peak-marker"></div><div id="barA2" class="bar-fill"></div></div>
      </div>
      <div class="hook-row" style="margin-bottom:0;">
        <div class="hook-header"><span style="color:var(--text);">HOOK B</span><span id="valB" class="hook-val">--</span></div>
        <div class="bar-label"><span>Fine Res (2.5k - 4.5k)</span></div>
        <div class="bar-wrapper"><div id="peakB1" class="peak-marker"></div><div id="barB1" class="bar-fill"></div></div>
        <div class="bar-label" style="margin-top:8px;"><span>Overload (4.5k - 40k)</span></div>
        <div class="bar-wrapper"><div id="peakB2" class="peak-marker"></div><div id="barB2" class="bar-fill"></div></div>
      </div>
    </div>
    <div class="panel">
      <h2 class="panel-title">Hardware Integrity</h2>
      <div class="buckle-grid">
        <div class="buckle-card"><div class="b-label">Buckle 1</div><div id="b1" class="badge bg-safe">CHK</div></div>
        <div class="buckle-card"><div class="b-label">Buckle 2</div><div id="b2" class="badge bg-safe">CHK</div></div>
        <div class="buckle-card"><div class="b-label">Buckle 3</div><div id="b3" class="badge bg-safe">CHK</div></div>
      </div>
      <div style="margin-top: auto;">
        <button id="safetyBtn" class="btn-full" onclick="toggleSafetyMode()">Safety Mode: OFF (Siren Disabled)</button>
        <button id="alarmBtn" class="btn-full" onclick="triggerAlarm()">Trigger Physical Harness Alarm</button>
        <div class="footer" style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 10px;">
          <span>BATTERY SYSTEM: <span id="batt">--</span></span>
        </div>
      </div>
    </div>
    <div class="panel">
      <h2 class="panel-title">Data Recorder & Logs</h2>
      <div class="ctrl-grid">
        <button id="recordBtn" onclick="toggleRecording()">REC DATA</button>
        <button id="downloadBtn" onclick="downloadCSV()">GET CSV</button>
      </div>
      <div id="console" class="console-box">
        <div class="console-entry"><span class="console-time">[SYS]</span> Command Center Online. WebSocket mode active.</div>
      </div>
      <div class="footer">
        <span id="recStats" style="color:var(--safe)">Ready to record.</span>
      </div>
    </div>
  </div>
  <script>
    let peakA1 = 0, peakA2 = 0, peakB1 = 0, peakB2 = 0;
    let lastB1, lastB2, lastB3, lastAlarm;
    let lastFetchTime = Date.now();
    let threshA = 3870, threshB = 3870;
    let isRecording = false, csvData = [], recordStartTime = 0;
    let safetyMode = false, audioCtx, nextSirenTime = 0;

    function updateThresh(hook, val) {
      if (hook === 'A') { threshA = parseInt(val, 10); document.getElementById('threshValA').innerText = val; }
      else { threshB = parseInt(val, 10); document.getElementById('threshValB').innerText = val; }
    }

    function toggleSafetyMode() {
      safetyMode = !safetyMode;
      const btn = document.getElementById('safetyBtn');
      if (safetyMode) {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        btn.innerText = "SAFETY MODE: ACTIVE (SIREN ARMED)";
        btn.className = "btn-full active";
        logEvent("Safety Monitor Armed. Air Raid Siren Active.", "log-alert");
      } else {
        btn.innerText = "SAFETY MODE: OFF (SIREN DISABLED)";
        btn.className = "btn-full";
        logEvent("Safety Monitor Disabled.");
      }
    }

    function playAirRaidSiren() {
      if (!audioCtx || audioCtx.state !== 'running') return;
      if (Date.now() < nextSirenTime) return;
      nextSirenTime = Date.now() + 4000;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 2);
      osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 4);
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime + 3.5);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 4);
    }

    function resetCSV() {
      csvData = [["Time(s)", "Hook A", "Hook B", "Buckle 1", "Buckle 2", "Buckle 3", "Batt %", "Alarm", "Thresh A", "Thresh B"]];
    }

    function logEvent(msg, type = "") {
      const box = document.getElementById('console');
      const time = new Date().toLocaleTimeString('en-US', { hour12: false });
      const row = `<div class="console-entry ${type}"><span class="console-time">[${time}]</span>${msg}</div>`;
      box.innerHTML = row + box.innerHTML;
      if (box.children.length > 50) box.removeChild(box.lastChild);
    }

    function getPct1(val) { return Math.max(0, Math.min(((val - 2500) / (4500 - 2500)) * 100, 100)); }
    function getColor1(pct) { return `rgb(${Math.floor(255 * (pct/100))}, ${Math.floor(255 * (1 - (pct/100)))}, 0)`; }
    function getPct2(val) { return Math.max(0, Math.min(((val - 4500) / (40000 - 4500)) * 100, 100)); }
    function getColor2(pct) { return `rgb(255, ${Math.floor(165 * (1 - (pct/100)))}, 0)`; }

    function updateBuckle(id, state, name, lastStateVar) {
      const el = document.getElementById(id);
      if (state === "0") {
        el.innerText = "FASTENED";
        el.className = "badge bg-safe";
      } else {
        el.innerText = "OPEN";
        el.className = "badge bg-danger";
      }
      if (lastStateVar !== undefined && lastStateVar !== state) {
        const status = state === "0" ? "Secured" : "UNLATCHED";
        const css = state === "0" ? "" : "log-danger";
        logEvent(`[${name}] ${status}`, css);
      }
      return state;
    }

    let telemetrySocket = null;
    let reconnectTimer = null;
    const WS_PORT = __WS_PORT__;

    function setLinkStatus(live) {
      const dot = document.getElementById('linkDot');
      const text = document.getElementById('linkText');
      if (live) {
        dot.className = "dot";
        text.innerText = "SYSTEM LIVE";
        text.style.color = "var(--subtext)";
      } else {
        dot.className = "dot offline";
        text.innerText = "CONNECTION LOST";
        text.style.color = "var(--danger)";
      }
    }

    function applyTelemetry(t) {
      lastFetchTime = Date.now();
      setLinkStatus(true);

      const v = t.split(',');
      if (v.length < 8) return;

      const valA = parseInt(v[0], 10);
      const valB = parseInt(v[1], 10);
      const isTouchingA = valA > threshA;
      const isTouchingB = valB > threshB;
      const isTouching = isTouchingA || isTouchingB;

      document.getElementById('sensorPanel').className = isTouching ? "panel alerting" : "panel";
      document.getElementById('sensorWarning').style.display = isTouching ? "inline" : "none";
      document.getElementById('valA').style.color = isTouchingA ? "var(--danger)" : "var(--text)";
      document.getElementById('valB').style.color = isTouchingB ? "var(--danger)" : "var(--text)";

      if (valA > peakA1) peakA1 = valA; else peakA1 = Math.max(0, peakA1 - 20);
      if (valA > peakA2) peakA2 = valA; else peakA2 = Math.max(0, peakA2 - 500);
      if (valB > peakB1) peakB1 = valB; else peakB1 = Math.max(0, peakB1 - 20);
      if (valB > peakB2) peakB2 = valB; else peakB2 = Math.max(0, peakB2 - 500);

      document.getElementById('valA').innerText = valA;
      document.getElementById('barA1').style.width = getPct1(valA) + '%';
      document.getElementById('barA1').style.backgroundColor = getColor1(getPct1(valA));
      document.getElementById('peakA1').style.left = getPct1(peakA1) + '%';
      document.getElementById('barA2').style.width = getPct2(valA) + '%';
      document.getElementById('barA2').style.backgroundColor = getColor2(getPct2(valA));
      document.getElementById('peakA2').style.left = getPct2(peakA2) + '%';

      document.getElementById('valB').innerText = valB;
      document.getElementById('barB1').style.width = getPct1(valB) + '%';
      document.getElementById('barB1').style.backgroundColor = getColor1(getPct1(valB));
      document.getElementById('peakB1').style.left = getPct1(peakB1) + '%';
      document.getElementById('barB2').style.width = getPct2(valB) + '%';
      document.getElementById('barB2').style.backgroundColor = getColor2(getPct2(valB));
      document.getElementById('peakB2').style.left = getPct2(peakB2) + '%';

      const battEl = document.getElementById('batt');
      battEl.innerText = v[2] + "% (" + v[3] + "V)";
      battEl.style.color = parseInt(v[2], 10) < 20 ? "var(--danger)" : "var(--safe)";

      lastB1 = updateBuckle('b1', v[4], 'Buckle 1', lastB1);
      lastB2 = updateBuckle('b2', v[5], 'Buckle 2', lastB2);
      lastB3 = updateBuckle('b3', v[6], 'Buckle 3', lastB3);

      if (safetyMode && (v[4] === "1" || v[5] === "1" || v[6] === "1")) playAirRaidSiren();

      const btn = document.getElementById('alarmBtn');
      if (v[7] === "1") {
        btn.innerText = "!! ALARM ACTIVE !!";
        btn.className = "btn-full active";
        document.body.className = "alarm-red";
        if (lastAlarm !== "1") logEvent("PHYSICAL HARNESS ALARM TRIGGERED", "log-danger");
      } else {
        btn.innerText = "Trigger Physical Harness Alarm";
        btn.className = "btn-full";
        document.body.className = "";
        if (lastAlarm === "1") logEvent("Alarm sequence completed.");
      }
      lastAlarm = v[7];

      if (isRecording) {
        const elapsedTime = ((Date.now() - recordStartTime) / 1000).toFixed(2);
        csvData.push([elapsedTime, v[0], v[1], v[4], v[5], v[6], v[2], v[7], threshA, threshB]);
        document.getElementById('recStats').innerText = `[REC] ${csvData.length - 1} frames logged`;
      }
    }

    function connectTelemetrySocket() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (telemetrySocket) {
        telemetrySocket.onclose = null;
        telemetrySocket.close();
      }

      const wsProto = location.protocol === "https:" ? "wss" : "ws";
      const wsUrl = `${wsProto}://${location.hostname}:${WS_PORT}`;
      telemetrySocket = new WebSocket(wsUrl);

      telemetrySocket.onopen = () => {
        setLinkStatus(true);
        logEvent("WebSocket connected.", "log-alert");
      };

      telemetrySocket.onmessage = (event) => {
        applyTelemetry(String(event.data));
      };

      telemetrySocket.onerror = () => {
        setLinkStatus(false);
      };

      telemetrySocket.onclose = () => {
        setLinkStatus(false);
        reconnectTimer = setTimeout(connectTelemetrySocket, 1000);
      };
    }

    setInterval(function() {
      if (Date.now() - lastFetchTime > 2500) setLinkStatus(false);
    }, 500);

    connectTelemetrySocket();

    function triggerAlarm() {
      if (telemetrySocket && telemetrySocket.readyState === WebSocket.OPEN) {
        telemetrySocket.send(JSON.stringify({ action: "trigger" }));
      }
    }

    function toggleRecording() {
      const recBtn = document.getElementById('recordBtn');
      const dlBtn = document.getElementById('downloadBtn');
      if (!isRecording) {
        resetCSV();
        recordStartTime = Date.now();
        isRecording = true;
        recBtn.innerText = "STOP REC";
        recBtn.className = "recording";
        dlBtn.style.display = "none";
        logEvent("Telemetry logging started.", "log-alert");
      } else {
        isRecording = false;
        recBtn.innerText = "NEW REC";
        recBtn.className = "";
        dlBtn.style.display = "block";
        logEvent("Logging stopped. Ready for download.", "log-alert");
      }
    }

    function downloadCSV() {
      const csvContent = csvData.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "telemetry_log.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      logEvent("CSV file downloaded successfully.");
    }

    function toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  </script>
</body>
</html>
"""


class ProxyConfig:
    def __init__(
        self,
        esp_base_url: str,
        timeout_s: float,
        auto_discover: bool,
        rediscover_every_s: float,
        poll_interval_s: float,
    ):
        self.esp_base_url = esp_base_url.rstrip("/") if esp_base_url else ""
        self.timeout_s = timeout_s
        self.auto_discover = auto_discover
        self.rediscover_every_s = rediscover_every_s
        self.poll_interval_s = poll_interval_s
        self.last_discovery_attempt_s = 0.0
        self.lock = threading.Lock()


CONFIG: ProxyConfig
WS_CLIENTS: Set[WebSocketServerProtocol] = set()
WS_CLIENTS_LOCK = threading.Lock()
FALLBACK_TELEMETRY = "0,0,0,0.00,1,1,1,0"


def fetch_from_base(base_url: str, path: str, timeout_s: float) -> bytes:
    url = f"{base_url.rstrip('/')}{path}"
    req = request.Request(url=url, method="GET")
    with request.urlopen(req, timeout=timeout_s) as resp:
        return resp.read()


def normalize_base_url(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        return ""
    if not raw.startswith("http://") and not raw.startswith("https://"):
        raw = f"http://{raw}"
    return raw.rstrip("/")


def get_local_subnet_prefix() -> Optional[str]:
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("8.8.8.8", 80))
        local_ip = probe.getsockname()[0]
    except OSError:
        return None
    finally:
        probe.close()
    parts = local_ip.split(".")
    if len(parts) != 4:
        return None
    return ".".join(parts[:3]) + "."


def looks_like_esp_payload(payload: bytes) -> bool:
    text = payload.decode("utf-8", errors="ignore").strip()
    fields = text.split(",")
    return len(fields) >= 8


def is_esp_reachable(base_url: str, timeout_s: float) -> bool:
    try:
        payload = fetch_from_base(base_url, "/data", timeout_s)
        return looks_like_esp_payload(payload)
    except (error.URLError, error.HTTPError, TimeoutError, socket.timeout, ValueError):
        return False


def discover_esp_base_url(timeout_s: float, hint_url: str = "") -> Optional[str]:
    if hint_url:
        candidate = normalize_base_url(hint_url)
        if candidate and is_esp_reachable(candidate, timeout_s):
            return candidate

    subnet = get_local_subnet_prefix()
    if not subnet:
        return None

    # Try likely DHCP addresses first, then full subnet.
    priority_hosts = [50, 60, 42, 100, 101, 10, 20, 30, 40]
    tried = set()
    for host in priority_hosts + list(range(1, 255)):
        if host in tried:
            continue
        tried.add(host)
        candidate = f"http://{subnet}{host}"
        if is_esp_reachable(candidate, timeout_s):
            return candidate
    return None


def maybe_rediscover_esp(force: bool = False) -> Optional[str]:
    if not CONFIG.auto_discover:
        return None
    now = time.time()
    with CONFIG.lock:
        if not force and (now - CONFIG.last_discovery_attempt_s) < CONFIG.rediscover_every_s:
            return CONFIG.esp_base_url or None
        CONFIG.last_discovery_attempt_s = now
        discovered = discover_esp_base_url(CONFIG.timeout_s, CONFIG.esp_base_url)
        if discovered and discovered != CONFIG.esp_base_url:
            CONFIG.esp_base_url = discovered
            print(f"[DISCOVERY] Connected to ESP8266 at {CONFIG.esp_base_url}")
        return CONFIG.esp_base_url or None


def fetch_from_esp(path: str, timeout_s: float) -> bytes:
    base = CONFIG.esp_base_url
    if not base and CONFIG.auto_discover:
        base = maybe_rediscover_esp(force=True) or ""
    if not base:
        raise error.URLError("ESP base URL not configured")

    try:
        return fetch_from_base(base, path, timeout_s)
    except (error.URLError, error.HTTPError, TimeoutError, socket.timeout):
        # Re-discover and retry once.
        rediscovered = maybe_rediscover_esp(force=True)
        if not rediscovered:
            raise
        return fetch_from_base(rediscovered, path, timeout_s)


def fetch_esp_telemetry_text() -> str:
    try:
        return fetch_from_esp("/data", CONFIG.timeout_s).decode("utf-8", errors="ignore").strip()
    except (error.URLError, error.HTTPError, TimeoutError, socket.timeout, OSError):
        return FALLBACK_TELEMETRY


def trigger_esp_alarm() -> None:
    try:
        fetch_from_esp("/trigger", CONFIG.timeout_s)
    except (error.URLError, error.HTTPError, TimeoutError, socket.timeout, OSError):
        pass


def render_dashboard_html(ws_port: int) -> str:
    return DASHBOARD_HTML.replace("__WS_PORT__", str(ws_port))


async def ws_register_client(websocket: WebSocketServerProtocol) -> None:
    with WS_CLIENTS_LOCK:
        WS_CLIENTS.add(websocket)
    try:
        async for message in websocket:
            await ws_handle_client_message(message)
    finally:
        with WS_CLIENTS_LOCK:
            WS_CLIENTS.discard(websocket)


async def ws_handle_client_message(message: str) -> None:
    try:
        payload = json.loads(message)
    except json.JSONDecodeError:
        return
    if payload.get("action") == "trigger":
        await asyncio.to_thread(trigger_esp_alarm)


async def ws_broadcast_telemetry(text: str) -> None:
    with WS_CLIENTS_LOCK:
        clients = list(WS_CLIENTS)
    if not clients:
        return
    await asyncio.gather(*(client.send(text) for client in clients), return_exceptions=True)


async def ws_poll_esp_loop(stop_event: threading.Event) -> None:
    while not stop_event.is_set():
        telemetry = await asyncio.to_thread(fetch_esp_telemetry_text)
        await ws_broadcast_telemetry(telemetry)
        await asyncio.sleep(CONFIG.poll_interval_s)


async def run_websocket_server(host: str, port: int, stop_event: threading.Event) -> None:
    async with websockets.serve(ws_register_client, host, port):
        await ws_poll_esp_loop(stop_event)


def start_websocket_thread(host: str, port: int, stop_event: threading.Event) -> threading.Thread:
    def _runner() -> None:
        asyncio.run(run_websocket_server(host, port, stop_event))

    thread = threading.Thread(target=_runner, name="websocket-server", daemon=True)
    thread.start()
    return thread


class DashboardHandler(BaseHTTPRequestHandler):
    server_version = "ESPProxyDashboard/1.0"

    def _write_bytes(self, status: int, content_type: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path == "/":
            html = render_dashboard_html(self.server.ws_port)  # type: ignore[attr-defined]
            self._write_bytes(200, "text/html; charset=utf-8", html.encode("utf-8"))
            return
        if path == "/healthz":
            with WS_CLIENTS_LOCK:
                ws_clients = len(WS_CLIENTS)
            body = json.dumps(
                {
                    "ok": True,
                    "esp_base_url": CONFIG.esp_base_url or None,
                    "auto_discover": CONFIG.auto_discover,
                    "ws_clients": ws_clients,
                    "transport": "websocket",
                    "timestamp": time.time(),
                }
            )
            self._write_bytes(200, "application/json; charset=utf-8", body.encode("utf-8"))
            return
        self._write_bytes(404, "text/plain; charset=utf-8", b"Not Found")

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} - {fmt % args}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Serve dashboard with WebSocket telemetry from ESP8266."
    )
    parser.add_argument(
        "--esp-url",
        default="",
        help="Optional base URL/IP of ESP8266, e.g. http://192.168.1.50 or 192.168.1.50",
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host/IP for local dashboard server.")
    parser.add_argument("--port", type=int, default=8080, help="Port for local dashboard server.")
    parser.add_argument("--timeout", type=float, default=0.7, help="ESP request timeout in seconds.")
    parser.add_argument(
        "--no-auto-discover",
        action="store_true",
        help="Disable automatic ESP discovery/re-discovery on local network.",
    )
    parser.add_argument(
        "--rediscover-every",
        type=float,
        default=3.0,
        help="Minimum seconds between discovery scans.",
    )
    parser.add_argument(
        "--ws-port",
        type=int,
        default=0,
        help="WebSocket port (default: HTTP port + 1).",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=0.15,
        help="How often Python polls ESP and pushes to WebSocket clients (seconds).",
    )
    return parser.parse_args()


def main() -> None:
    global CONFIG
    args = parse_args()
    ws_port = args.ws_port if args.ws_port > 0 else args.port + 1
    normalized_esp = normalize_base_url(args.esp_url)
    auto_discover = not args.no_auto_discover
    CONFIG = ProxyConfig(
        esp_base_url=normalized_esp,
        timeout_s=args.timeout,
        auto_discover=auto_discover,
        rediscover_every_s=max(args.rediscover_every, 0.1),
        poll_interval_s=max(args.poll_interval, 0.05),
    )
    if CONFIG.esp_base_url:
        print(f"Initial ESP target: {CONFIG.esp_base_url}")
    if CONFIG.auto_discover:
        maybe_rediscover_esp(force=True)

    stop_event = threading.Event()
    start_websocket_thread(args.host, ws_port, stop_event)

    httpd = ThreadingHTTPServer((args.host, args.port), DashboardHandler)
    httpd.ws_port = ws_port  # type: ignore[attr-defined]
    print(f"Dashboard URL: http://localhost:{args.port}")
    print(f"WebSocket URL: ws://localhost:{ws_port}")
    if CONFIG.esp_base_url:
        print(f"Polling ESP8266 from: {CONFIG.esp_base_url}")
    else:
        print("ESP8266 not found yet. WebSocket will send fallback values until found.")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        stop_event.set()
        httpd.server_close()


if __name__ == "__main__":
    main()
