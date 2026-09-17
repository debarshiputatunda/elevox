#include "legacy_config.h"
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>


/************** 1. CONFIGURATION **************/
const char* ssid = ELEVOX_LOCAL_SSID; 
const char* password = ELEVOX_LOCAL_PASSWORD;


const int HOOK_A_PIN = 5; // D1 (GPIO5)
const int HOOK_B_PIN = 4; // D2 (GPIO4)


#define BUCKLE1_PIN D7
#define BUCKLE2_PIN D0
#define BUCKLE3_PIN D5


#define LED_PIN     D6
#define BUZZER_PIN  D8


ESP8266WebServer server(80);


/************** 2. SYSTEM GLOBALS **************/
float smoothedA = -1;
float smoothedB = -1;
const float smoothingAlpha = 0.2; 


float battVoltage = 0.0;
int battPercent = 0;
unsigned long lastBatteryRead = 0;


bool buckleState[3] = {true, true, true};
bool lastReading[3] = {true, true, true};
unsigned long debounceTime[3] = {0, 0, 0};
const int DEBOUNCE_MS = 50;


bool alarmActive = false;
unsigned long alarmStartTime = 0;
const unsigned long ALARM_DURATION = 10000; 
unsigned long lastBuzzerToggle = 0;
bool buzzerState = false;


/************** 3. PROFESSIONAL 3-COLUMN DASHBOARD **************/
String webpage = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Harness Telemetry Command</title>
  <style>
    :root { 
      --bg: #e0f2fe;        /* Light Slate Blue Background */
      --panel: #ffffff;     /* White Panels */
      --text: #0f172a;      /* Very Dark Blue Text */
      --subtext: #475569;   /* Gray for labels */
      --accent: #2563eb;    /* Bright Blue Buttons */
      --safe: #10b981;      /* Green */
      --danger: #ef4444;    /* Red */
      --warn: #f59e0b;      /* Orange */
      --border: #cbd5e1;    /* Light Gray Borders */
    }
    
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background-color: var(--bg); color: var(--text); margin: 0; padding: 20px; transition: box-shadow 0.3s; height: 100vh; overflow-y: auto;}
    
    .header { display: flex; justify-content: space-between; align-items: center; max-width: 1500px; margin: 0 auto 15px auto; padding-bottom: 10px; border-bottom: 2px solid var(--border); }
    .title-area h1 { margin: 0 0 5px 0; font-size: 1.6rem; letter-spacing: 1px; text-transform: uppercase; color: var(--text); }
    .status-badge { display: flex; align-items: center; font-size: 0.85rem; color: var(--subtext); font-weight: 700; letter-spacing: 1px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: var(--safe); margin-right: 8px; box-shadow: 0 0 8px var(--safe); animation: pulseDot 2s infinite; }
    .dot.offline { background: var(--danger); box-shadow: 0 0 8px var(--danger); animation: none; }
    
    /* 3-Column Layout for Desktop */
    .dashboard { display: grid; grid-template-columns: 1fr; gap: 15px; max-width: 1500px; margin: 0 auto; align-items: stretch; }
    @media (min-width: 1024px) { .dashboard { grid-template-columns: repeat(3, 1fr); } }


    .panel { background: var(--panel); padding: 20px; border-radius: 10px; border: 1px solid var(--border); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; transition: 0.3s; }
    .panel-title { font-size: 0.85rem; font-weight: 800; color: var(--subtext); text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 15px 0; border-bottom: 1px solid var(--border); padding-bottom: 8px; display: flex; justify-content: space-between;}
    
    /* Dual Threshold Sliders */
    .slider-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 20px; }
    .slider-row { display: flex; align-items: center; gap: 10px; background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); }
    .slider-row label { font-size: 0.75rem; font-weight: bold; color: var(--subtext); text-transform: uppercase; white-space: nowrap; width: 65px;}
    input[type=range] { flex-grow: 1; accent-color: var(--accent); }
    .thresh-val { font-family: monospace;    font-size: 1.1rem; font-weight: bold; color: var(--accent); min-width: 50px; text-align: right; }


    /* Dual Hook Bars */
    .hook-row { margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid var(--border); }
    .hook-header { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 8px; font-size: 1.1rem; }
    .hook-val { font-family: 'Courier New', monospace; font-size: 1.4rem; font-weight: bold; }
    
    .bar-label { font-size: 0.65rem; font-weight: bold; color: var(--subtext); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; display: flex; justify-content: space-between; }
    .bar-wrapper { position: relative; width: 100%; background: #1e293b; border-radius: 4px; height: 12px; overflow: hidden; margin-bottom: 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);}
    .bar-fill { height: 100%; width: 0%; transition: width 0.1s linear, background-color 0.1s linear; }
    .peak-marker { position: absolute; top: 0; bottom: 0; width: 2px; background: white; z-index: 10; transition: left 0.1s; }


    .panel.alerting { border-color: var(--danger); box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); animation: subtleFlash 1s infinite; }
    .alert-text { color: var(--danger); font-weight: bold; animation: pulseDot 1s infinite; }


    /* Buckle Grid */
    .buckle-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: auto;}
    .buckle-card { background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
    .b-label { font-size: 0.85rem; font-weight: 800; color: var(--subtext); text-transform: uppercase; letter-spacing: 1px; }
    .badge { padding: 8px 16px; border-radius: 4px; font-size: 0.9rem; font-weight: bold; letter-spacing: 1px; }
    .bg-safe { background-color: rgba(16, 185, 129, 0.15); color: var(--safe); border: 1px solid var(--safe); }
    .bg-danger { background-color: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid var(--danger); }
    
    /* Controls */
    .ctrl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;}
    button { padding: 14px; border: none; border-radius: 6px; font-size: 0.9rem; font-weight: 800; cursor: pointer; transition: 0.2s; color: white; text-transform: uppercase; letter-spacing: 1px; font-family: inherit;}
    button:active { transform: scale(0.97); }
    .btn-full { width: 100%; margin-top: 10px; }
    
    #recordBtn { background: var(--accent); }
    #recordBtn.recording { background: var(--safe); animation: flash 1s infinite; }
    #downloadBtn { background: var(--subtext); display: none; }
    
    #safetyBtn { background: #f1f5f9; color: var(--text); border: 2px solid var(--border); }
    #safetyBtn.active { background: var(--warn); color: white; border-color: var(--warn); box-shadow: 0 0 15px rgba(245, 158, 11, 0.4); }


    #alarmBtn { background: #f1f5f9; color: var(--text); border: 2px solid var(--border); }
    #alarmBtn.active { background: var(--danger); color: white; border-color: var(--danger); pointer-events: none; }


    /* Console */
    .console-box { background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; padding: 15px; flex-grow: 1; min-height: 200px; overflow-y: auto; font-family: monospace; font-size: 0.85rem; color: var(--subtext); display: flex; flex-direction: column; }
    .console-entry { padding: 4px 0; border-bottom: 1px solid #e2e8f0; }
    .console-time { color: var(--accent); margin-right: 10px; font-weight: bold;}
    .log-alert { color: var(--warn); font-weight: bold; }
    .log-danger { color: var(--danger); font-weight: bold; }


    .footer { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--subtext); margin-top: 15px; font-weight: 800;}
    .btn-small { padding: 6px 10px; font-size: 0.75rem; background: var(--panel); border: 1px solid var(--border); color: var(--subtext); border-radius: 4px;}


    @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; box-shadow: 0 0 15px var(--danger); } }
    @keyframes subtleFlash { 0%, 100% { background-color: var(--panel); } 50% { background-color: #fee2e2; } }
    @keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1;} 50% { transform: scale(1.3); opacity: 0.6;} }
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
        <div class="console-entry"><span class="console-time">[SYS]</span> Command Center Online. 3-Column Layout.</div>
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
    let isRecording = false; let csvData = []; let recordStartTime = 0;
    
    // --- AIR RAID SIREN AUDIO ENGINE ---
    let safetyMode = false;
    let audioCtx;
    let nextSirenTime = 0;


    function updateThresh(hook, val) {
      if(hook === 'A') { threshA = parseInt(val); document.getElementById('threshValA').innerText = val; }
      else { threshB = parseInt(val); document.getElementById('threshValB').innerText = val; }
    }


    function toggleSafetyMode() {
      safetyMode = !safetyMode;
      let btn = document.getElementById('safetyBtn');
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
      nextSirenTime = Date.now() + 4000; // Siren cycle is 4 seconds long
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth'; // Harsh, buzzing siren tone
      
      // Sweep Frequency (400Hz up to 800Hz, then back down)
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 2);
      osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 4);
      
      // Volume Fade In/Out
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.4, audioCtx.currentTime + 3.5);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 4);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 4);
    }


    function resetCSV() { csvData = [["Time(s)", "Hook A", "Hook B", "Buckle 1", "Buckle 2", "Buckle 3", "Batt %", "Alarm", "Thresh A", "Thresh B"]]; }


    function logEvent(msg, type="") {
      let box = document.getElementById('console');
      let time = new Date().toLocaleTimeString('en-US', { hour12: false });
      let row = `<div class="console-entry ${type}"><span class="console-time">[${time}]</span> ${msg}</div>`;
      box.innerHTML = row + box.innerHTML;
      if(box.children.length > 50) box.removeChild(box.lastChild);
    }


    // Math for Bar 1 (2500 - 4500)
    function getPct1(val) { return Math.max(0, Math.min(((val - 2500) / (4500 - 2500)) * 100, 100)); }
    function getColor1(pct) { return `rgb(${Math.floor(255 * (pct/100))}, ${Math.floor(255 * (1 - (pct/100)))}, 0)`; }
    
    // Math for Bar 2 (4500 - 40000)
    function getPct2(val) { return Math.max(0, Math.min(((val - 4500) / (40000 - 4500)) * 100, 100)); }
    function getColor2(pct) { return `rgb(255, ${Math.floor(165 * (1 - (pct/100)))}, 0)`; }


    setInterval(function() {
      if (Date.now() - lastFetchTime > 2500) {
        document.getElementById('linkDot').className = "dot offline";
        document.getElementById('linkText').innerText = "CONNECTION LOST";
        document.getElementById('linkText').style.color = "var(--danger)";
      }


      fetch('/data').then(r => r.text()).then(t => {
        lastFetchTime = Date.now();
        document.getElementById('linkDot').className = "dot";
        document.getElementById('linkText').innerText = "SYSTEM LIVE";
        document.getElementById('linkText').style.color = "var(--subtext)";


        let v = t.split(','); 
        let valA = parseInt(v[0]); let valB = parseInt(v[1]);
        
        let isTouchingA = (valA > threshA);
        let isTouchingB = (valB > threshB);
        let isTouching = (isTouchingA || isTouchingB);


        document.getElementById('sensorPanel').className = isTouching ? "panel alerting" : "panel";
        document.getElementById('sensorWarning').style.display = isTouching ? "inline" : "none";
        document.getElementById('valA').style.color = isTouchingA ? "var(--danger)" : "var(--text)";
        document.getElementById('valB').style.color = isTouchingB ? "var(--danger)" : "var(--text)";


        // HOOK A UPDATES
        if (valA > peakA1) peakA1 = valA; else peakA1 = Math.max(0, peakA1 - 20);
        if (valA > peakA2) peakA2 = valA; else peakA2 = Math.max(0, peakA2 - 500);
        
        document.getElementById('valA').innerText = valA;
        document.getElementById('barA1').style.width = getPct1(valA) + '%';
        document.getElementById('barA1').style.backgroundColor = getColor1(getPct1(valA));
        document.getElementById('peakA1').style.left = getPct1(peakA1) + '%';
        
        document.getElementById('barA2').style.width = getPct2(valA) + '%';
        document.getElementById('barA2').style.backgroundColor = getColor2(getPct2(valA));
        document.getElementById('peakA2').style.left = getPct2(peakA2) + '%';


        // HOOK B UPDATES
        if (valB > peakB1) peakB1 = valB; else peakB1 = Math.max(0, peakB1 - 20);
        if (valB > peakB2) peakB2 = valB; else peakB2 = Math.max(0, peakB2 - 500);


        document.getElementById('valB').innerText = valB;
        document.getElementById('barB1').style.width = getPct1(valB) + '%';
        document.getElementById('barB1').style.backgroundColor = getColor1(getPct1(valB));
        document.getElementById('peakB1').style.left = getPct1(peakB1) + '%';
        
        document.getElementById('barB2').style.width = getPct2(valB) + '%';
        document.getElementById('barB2').style.backgroundColor = getColor2(getPct2(valB));
        document.getElementById('peakB2').style.left = getPct2(peakB2) + '%';
        
        // Battery
        let battEl = document.getElementById('batt');
        battEl.innerText = v[2] + "% (" + v[3] + "V)";
        battEl.style.color = parseInt(v[2]) < 20 ? "var(--danger)" : "var(--safe)";


        // Buckles
        let updateB = (id, state, name, lastStateVar) => {
          let el = document.getElementById(id);
          if (state === "0") {
            el.innerText = "FASTENED"; el.className = "badge bg-safe";
          } else {
            el.innerText = "OPEN"; el.className = "badge bg-danger flashing";
          }
          if (lastStateVar !== undefined && lastStateVar !== state) {
             let status = state === "0" ? "Secured" : "UNLATCHED";
             let css = state === "0" ? "" : "log-danger";
             logEvent(`[${name}] ${status}`, css);
          }
          return state;
        };
        lastB1 = updateB('b1', v[4], 'Buckle 1', lastB1); 
        lastB2 = updateB('b2', v[5], 'Buckle 2', lastB2); 
        lastB3 = updateB('b3', v[6], 'Buckle 3', lastB3);
        
        // --- THE AIR RAID SIREN TRIGGER ---
        if (safetyMode && (v[4] === "1" || v[5] === "1" || v[6] === "1")) {
          playAirRaidSiren();
        }


        // Harness Hardware Alarm
        let btn = document.getElementById('alarmBtn');
        if (v[7] == "1") {
          btn.innerText = "!! ALARM ACTIVE !!"; btn.className = "btn-full active flashing";
          document.body.className = "alarm-red";
          if (lastAlarm !== "1") logEvent("PHYSICAL HARNESS ALARM TRIGGERED", "log-danger");
        } else {
          btn.innerText = "Trigger Physical Harness Alarm"; btn.className = "btn-full";
          document.body.className = "";
          if (lastAlarm === "1") logEvent("Alarm sequence completed.");
        }
        lastAlarm = v[7];


        if (isRecording) {
          let elapsedTime = ((Date.now() - recordStartTime) / 1000).toFixed(2);
          csvData.push([elapsedTime, v[0], v[1], v[4], v[5], v[6], v[2], v[7], threshA, threshB]);
          document.getElementById('recStats').innerText = `[REC] ${csvData.length - 1} frames logged`;
        }
      }).catch(e => {});
    }, 150);


    function triggerAlarm() { fetch('/trigger'); }


    function toggleRecording() {
      let recBtn = document.getElementById('recordBtn');
      let dlBtn = document.getElementById('downloadBtn');
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
        logEvent(`Logging stopped. Ready for download.`, "log-alert");
      }
    }


    function downloadCSV() {
      let csvContent = csvData.map(e => e.join(",")).join("\n");
      let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      let url = URL.createObjectURL(blob);
      let link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "telemetry_log.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      logEvent("CSV file downloaded successfully.");
    }


    function toggleFullScreen() {
      if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(e => {}); } 
      else { if (document.exitFullscreen) { document.exitFullscreen(); } }
    }
  </script>
</body>
</html>
)rawliteral";


/************** SETUP **************/
void setup() {
  Serial.begin(115200);


  pinMode(BUCKLE1_PIN, INPUT_PULLUP);
  pinMode(BUCKLE2_PIN, INPUT);        
  pinMode(BUCKLE3_PIN, INPUT_PULLUP);
  
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);


  Serial.print("\nConnecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());


  server.on("/", []() { server.send(200, "text/html", webpage); });
  
  server.on("/data", []() { 
    String payload = String((long)smoothedA) + "," + String((long)smoothedB) + "," + 
                     String(battPercent) + "," + String(battVoltage, 2) + "," +
                     String(buckleState[0]) + "," + String(buckleState[1]) + "," + String(buckleState[2]) + "," +
                     String(alarmActive ? "1" : "0");
    server.send(200, "text/plain", payload); 
  });


  server.on("/trigger", []() {
    if (!alarmActive) {
      alarmActive = true;
      alarmStartTime = millis();
    }
    server.send(200, "text/plain", "TRIGGERED");
  });


  server.begin();
}


/************** THE SACRED PHYSICS ENGINE **************/
long readHook(int sensorPin, int shieldPin) {
  pinMode(shieldPin, OUTPUT);
  digitalWrite(shieldPin, LOW); 


  unsigned long totalCycles = 0;
  int validReadings = 0;


  for (int i = 0; i < 16; i++) {
    pinMode(sensorPin, OUTPUT);
    digitalWrite(sensorPin, HIGH);
    delayMicroseconds(50); 


    noInterrupts(); 
    pinMode(sensorPin, INPUT); 
    uint32_t start = ESP.getCycleCount();
    uint32_t current = start;


    while ((GPI & (1 << sensorPin)) != 0 && (current - start < 800000)) {
      current = ESP.getCycleCount();
    }
    interrupts(); 


    uint32_t cycleDiff = current - start;
    if (cycleDiff < 800000) {
      totalCycles += cycleDiff;
      validReadings++;
    }
  }
  return (validReadings > 0) ? (totalCycles / validReadings) : -1;
}


/************** MAIN LOOP **************/
/************** MAIN LOOP **************/
/************** MAIN LOOP **************/
void loop() {
  server.handleClient(); 
  unsigned long now = millis();


  // --- 1. PROCESS HOOKS ---
  long rawA = readHook(HOOK_A_PIN, HOOK_B_PIN);
  long rawB = readHook(HOOK_B_PIN, HOOK_A_PIN);


  smoothedA = (rawA == -1) ? -1 : ((smoothedA == -1) ? rawA : (rawA * smoothingAlpha) + (smoothedA * (1.0 - smoothingAlpha)));
  smoothedB = (rawB == -1) ? -1 : ((smoothedB == -1) ? rawB : (rawB * smoothingAlpha) + (smoothedB * (1.0 - smoothingAlpha)));


  // --- 2. PROCESS BATTERY ---
  if (now - lastBatteryRead > 2000) {
    lastBatteryRead = now;
    battVoltage = (analogRead(A0) / 1023.0) * 7.276; 
    if (battVoltage >= 4.2) battPercent = 100;
    else if (battVoltage <= 3.2) battPercent = 0;
    else battPercent = (int)(((battVoltage - 3.2) / (4.2 - 3.2)) * 100.0);
  }


  // --- 3. PROCESS BUCKLES ---
  int pins[3] = {BUCKLE1_PIN, BUCKLE2_PIN, BUCKLE3_PIN};
  bool anyBuckleOpen = false; 


  for (int i = 0; i < 3; i++) {
    bool reading = digitalRead(pins[i]);
    if (reading != lastReading[i]) debounceTime[i] = now;
    if ((now - debounceTime[i]) > DEBOUNCE_MS) {
      if (reading != buckleState[i]) buckleState[i] = reading;
    }
    lastReading[i] = reading;
    
    // Check if any of the 3 buckles are open (HIGH)
    if (buckleState[i] == 1) {
      anyBuckleOpen = true; 
    }
  }


  // Track exactly when the buckle was first opened for the escalation math
  static bool wasAnyBuckleOpen = false;
  static unsigned long buckleOpenStartTime = 0;
  
  if (anyBuckleOpen && !wasAnyBuckleOpen) {
    buckleOpenStartTime = now; // Mark the start time
  }
  wasAnyBuckleOpen = anyBuckleOpen;


  // --- 4. ESCALATING HARDWARE ALARM (Buzzer + LEDs on D6) ---
  if (alarmActive || anyBuckleOpen) {
    
    // Figure out how long the alarm has been ringing
    unsigned long elapsed = 0;
    if (alarmActive) {
      elapsed = now - alarmStartTime;
      if (elapsed >= ALARM_DURATION) alarmActive = false; // Auto-stop manual alarm
    } else {
      elapsed = now - buckleOpenStartTime;
    }


    // THE ESCALATION MATH: 
    // Map the elapsed time (0 to 10 seconds) to a blink speed (600ms down to 40ms)
    // 600ms = Calm warning. 40ms = Frantic strobe.
    long currentInterval = map(elapsed, 0, 10000, 600, 40);
    
    // Constrain it so it doesn't go dangerously fast or break the math after 10s
    currentInterval = constrain(currentInterval, 40, 600);


    // Toggle the Transistor
    if (now - lastBuzzerToggle >= currentInterval) {
      lastBuzzerToggle = now;
      buzzerState = !buzzerState; 
      
      // BC547 NPN Logic: HIGH turns it ON, LOW turns it OFF
      digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
    }
    
  } else {
    // Harness is completely safe. Kill power to the transistor.
    digitalWrite(BUZZER_PIN, LOW); 
  }


  delay(20); 
}
}