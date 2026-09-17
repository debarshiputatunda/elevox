#include "legacy_config.h"
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
 
/************** 1. HARDCODED NETWORK PARAMETERS **************/
const char* ssid = ELEVOX_LOCAL_SSID;
const char* password = ELEVOX_LOCAL_PASSWORD;
 
// Unique hardware tracking identifier for data scraping backend
const char* sboxID   = "SBOX-2026-6265";
 
/************** 2. HARDWARE INTEGRITY MAP **************/
const int HOOK_A_PIN = 5; // D1 (GPIO5)
const int HOOK_B_PIN = 4; // D2 (GPIO4)
 
// Fixed GPIO mappings for stable board compilation
#define BUCKLE1_PIN 13     // D7 is GPIO13
#define BUCKLE2_PIN 16     // D0 is GPIO16
#define BUCKLE3_PIN 14     // D5 is GPIO14
 
#define LED_PIN     12     // D6 is GPIO12
#define BUZZER_PIN  15     // D8 is GPIO15
 
ESP8266WebServer server(80);
 
/************** 3. SYSTEM TELESCOPE GLOBALS **************/
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
 
  // Direct, manual Station network linkage
  Serial.println("\n[SBOX] Initialization started.");
  Serial.print("[SBOX] Device ID: ");
  Serial.println(sboxID);
  Serial.print("[SBOX] Targeting network: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
 
  // Keep looping on boot until router assigns an IP
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
 
  Serial.println("\n[SBOX] Network Handshake complete!");
  Serial.print("[SBOX] Direct Access IP Address: ");
  Serial.println(WiFi.localIP());
 
  // --- ROOT ENDPOINT: CLEAN RAW PLAIN TEXT STRING ---
  server.on("/", []() {
    String dataPacket = "SBOX DATA FIELD TERMINAL\n";
    dataPacket += "-------------------------\n";
    dataPacket += "Device ID: " + String(sboxID) + "\n"; // Added identification tag
    dataPacket += "Hook A: " + String((long)smoothedA) + "\n";
    dataPacket += "Hook B: " + String((long)smoothedB) + "\n";
    dataPacket += "Battery Percentage: " + String(battPercent) + "%\n";
    dataPacket += "Battery Voltage: " + String(battVoltage, 2) + "V\n";
    dataPacket += "Buckle 1: " + String(buckleState[0] == 0 ? "LOCKED" : "OPEN") + "\n";
    dataPacket += "Buckle 2: " + String(buckleState[1] == 0 ? "LOCKED" : "OPEN") + "\n";
    dataPacket += "Buckle 3: " + String(buckleState[2] == 0 ? "LOCKED" : "OPEN") + "\n";
    dataPacket += "Buzzer Alarm State: " + String(alarmActive ? "ON" : "OFF") + "\n\n";
    dataPacket += "DATA ENDPOINTS:\n";
    dataPacket += " -> Scrape JSON/Comma Matrix: /data\n";
    dataPacket += " -> Force manual siren beep cycle: /trigger";
    
    server.send(200, "text/plain", dataPacket);
  });
  
  // Clean comma-separated string for automated telemetry scrapers
  server.on("/data", []() {
    String matrix = String(sboxID) + "," + // Added sboxID as index column zero
                    String((long)smoothedA) + "," + String((long)smoothedB) + "," +
                    String(battPercent) + "," + String(battVoltage, 2) + "," +
                    String(buckleState[0]) + "," + String(buckleState[1]) + "," + String(buckleState[2]) + "," +
                    String(alarmActive ? "1" : "0");
    server.send(200, "text/plain", matrix);
  });
 
  server.on("/trigger", []() {
    if (!alarmActive) {
      alarmActive = true;
      alarmStartTime = millis();
    }
    server.send(200, "text/plain", "ACK");
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
 
/************** MAIN CONSTANT PROCESSING EXECUTION **************/
void loop() {
  server.handleClient(); // Instantly handle inbound data connections
  
  unsigned long now = millis();
 
  // 1. Load Traces
  long rawA = readHook(HOOK_A_PIN, HOOK_B_PIN);
  long rawB = readHook(HOOK_B_PIN, HOOK_A_PIN);
  smoothedA = (rawA == -1) ? -1 : ((smoothedA == -1) ? rawA : (rawA * smoothingAlpha) + (smoothedA * (1.0 - smoothingAlpha)));
  smoothedB = (rawB == -1) ? -1 : ((smoothedB == -1) ? rawB : (rawB * smoothingAlpha) + (smoothedB * (1.0 - smoothingAlpha)));
 
  // 2. Fuel Tank Metrics
  if (now - lastBatteryRead > 2000) {
    lastBatteryRead = now;
    battVoltage = (analogRead(A0) / 1023.0) * 7.276;
    if (battVoltage >= 4.2) battPercent = 100;
    else if (battVoltage <= 3.2) battPercent = 0;
    else battPercent = (int)(((battVoltage - 3.2) / (4.2 - 3.2)) * 100.0);
  }
 
  // 3. Harness Locks
  int pins[3] = {BUCKLE1_PIN, BUCKLE2_PIN, BUCKLE3_PIN};
  bool anyBuckleOpen = false;
  for (int i = 0; i < 3; i++) {
    bool reading = digitalRead(pins[i]);
    if (reading != lastReading[i]) debounceTime[i] = now;
    if ((now - debounceTime[i]) > DEBOUNCE_MS) {
      if (reading != buckleState[i]) buckleState[i] = reading;
    }
    lastReading[i] = reading;
    if (buckleState[i] == 1) {
      anyBuckleOpen = true;
    }
  }
 
  static bool wasAnyBuckleOpen = false;
  static unsigned long buckleOpenStartTime = 0;
  if (anyBuckleOpen && !wasAnyBuckleOpen) {
    buckleOpenStartTime = now;
  }
  wasAnyBuckleOpen = anyBuckleOpen;
 
  // 4. Frequency Shifting Local Alarm Sounder
  if (alarmActive || anyBuckleOpen) {
    unsigned long elapsed = 0;
    if (alarmActive) {
      elapsed = now - alarmStartTime;
      if (elapsed >= ALARM_DURATION) alarmActive = false;
    } else {
      elapsed = now - buckleOpenStartTime;
    }
 
    long currentInterval = map(elapsed, 0, 10000, 600, 40);
    currentInterval = constrain(currentInterval, 40, 600);
    if (now - lastBuzzerToggle >= currentInterval) {
      lastBuzzerToggle = now;
      buzzerState = !buzzerState;
      digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
    }
    
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }
 
  delay(20);
}