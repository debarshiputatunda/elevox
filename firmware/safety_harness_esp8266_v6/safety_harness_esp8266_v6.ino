// v6: integrated v5 application with HIGH-guard alternating hook sensing.
// Experimental electrical classification; not proof of mechanical fastening.
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <ESP8266HTTPUpdateServer.h>
#include <ArduinoOTA.h>
#include <EEPROM.h>

#include <DNSServer.h>
#include "config.h"
#include "alarm_logic.h"
#include "wifi_settings.h"
#include "network_profiles.h"
#include "threshold_settings.h"
#include "device_preferences.h"
#include "prediction_calibration.h"
using namespace prediction_calibration;
const char* FIRMWARE_VERSION="v6.2.0";
DevicePreferences preferences;
PredictionCalibration calibration={};
CalibrationSession calibrationSession;
bool calibrationHandled=false,nameApplyPending=false;
uint32_t nameQueuedAt=0;
const char* calibrationSaveError="";

const char* sboxID = SBOX_DEVICE_ID;
char MDNS_NAME[32];
String apName;
DNSServer dnsServer;
NetworkStore netStore={};
NetworkRetry wifiRetry;
int activeNetwork=-1,queuedNetwork=-1;
bool wasStationConnected=false;
bool wifiApplyPending=false;
unsigned long wifiQueuedAt=0;

// Passwordless development firmware, including the existing update interfaces.
#define ENABLE_ARDUINO_OTA 1
const int HOOK_A_PIN = 5, HOOK_B_PIN = 4;
#if SBOX_SCHEMATIC_PINOUT
#define BUCKLE1_PIN 13
#define BUCKLE2_PIN 14
#define BUCKLE3_PIN 16
#define LED_PIN 2
#define BUZZER_PIN 12
#else
// Existing working Elevox board. Change only when the circuit is changed.
#define BUCKLE1_PIN 13
#define BUCKLE2_PIN 16
#define BUCKLE3_PIN 14
#define LED_PIN 12
#define BUZZER_PIN 15
#endif
#define PASSIVE_PIEZO 0

enum HookState {
  ST_FREE,
  ST_CONTACT,
  ST_HUMAN,
  ST_SHORT
};

ESP8266WebServer server(80);
ESP8266HTTPUpdateServer httpUpdater;

#include "high_guard_sensing.h"
const unsigned long SENSE_PERIOD_MS = 120;
bool mutualValid=false;
HookSampler hookSampler;
CapStat nextHookA={};
uint8_t sensingPhase=0;
uint32_t sampleSequence=0,sampleStamp=0,frameStarted=0,frameDuration=0;
CapStat hookA={0,0,0,false,0}, hookB={0,0,0,false,0};
float emaA=-1, emaB=-1;
uint32_t dispA=0, dispB=0, mutualAB=MUTUAL_CEIL;
int32_t loadA=0, loadB=0, linkIdx=0;
bool bridged=false;

float battVoltage=0.0; int battPercent=0; unsigned long lastBatteryRead=0;
bool buckleState[3]={true,true,true}, lastReading[3]={true,true,true};
unsigned long debounceTime[3]={0,0,0};
const int DEBOUNCE_MS=50;

enum AlarmMode { ALARM_NONE, ALARM_MANUAL, ALARM_HOOK, ALARM_BUCKLE, ALARM_SENSOR };
AlarmMode curMode=ALARM_NONE;
uint8_t patIdx=0;
unsigned long patStamp=0, lastBuzzerToggle=0, buckleAlarmStart=0;
bool buzzerState=false, alarmActive=false, hookViolation=false;
unsigned long alarmStartTime=0;
const unsigned long ALARM_DURATION=10000;

const uint16_t P_DOUBLE[]={120,120,120,600};
const uint16_t P_LONG[]={700,300};
const uint16_t P_CHIRP[]={60,60};
const uint16_t P_TRIPLE[]={90,90,90,90,90,550};
const uint16_t P_SLOW[]={200,900};
const uint16_t P_SOS[]={120,120,120,120,120,300,350,120,350,120,350,300,120,120,120,120,120,800};
const uint16_t P_URGENT[]={70,70,70,70,70,400};
struct Pat { const uint16_t* d; uint8_t n; };
const Pat PATS[]={ {NULL,0},{P_DOUBLE,4},{P_LONG,2},{P_CHIRP,2},{P_TRIPLE,6},{P_SLOW,2},{P_SOS,18},{P_URGENT,6} };
const uint8_t NPATS=8;

ThresholdState thresholdState;
uint32_t& thresholdA=thresholdState.a;
uint32_t& thresholdB=thresholdState.b;
uint8_t& hookAlarmEnabled=thresholdState.enabled;
bool guardFloat=false; // EEPROM compatibility only; v6 guard is fixed HIGH
uint16_t settleUs=3000, gapMs=5;
bool emaOn=true; uint8_t emaAlphaPct=20; // old_code always EMA-smoothed (alpha 0.2)
uint8_t patBuckle=0, patHook=1, patManual=2;
uint16_t freqBuckle=4000, freqHook=2200, freqManual=3000;
bool predictOn=true, buzzEnabled=true;
uint8_t buzzVol=100;
uint16_t mutShortMax=380, mutBridgeMax=1000;
uint16_t baseA=3870, baseB=3870; // old UI default idle-ish scale; recalibrate with CAPTURE BASELINE
uint16_t hookDelta=250;
uint8_t gain=1;

const uint32_t EE_MAGIC=0x5B0C0023; // v6 measurement scale: do not reuse v5 baselines or armed limits
void loadConfig(){
  EEPROM.begin(2048); // first 96 bytes retain the existing alarm settings
  uint32_t m; EEPROM.get(0,m);
  if(m!=EE_MAGIC) return;
  EEPROM.get(44,thresholdA); EEPROM.get(48,thresholdB);
  uint8_t enabled; EEPROM.get(52,enabled); hookAlarmEnabled=(enabled==1);
  uint32_t metadataMagic,checksum;EEPROM.get(84,metadataMagic);EEPROM.get(80,checksum);
  if(metadataMagic==0x54485236){
    ThresholdState saved;EEPROM.get(56,saved);
    if(saved.a<=100000 && saved.b<=100000 && saved.baseA<=100000 && saved.baseB<=100000 &&
       saved.enabled<=1 && saved.pending<=1 && saved.baseValid<=1 && checksum==thresholdChecksum(saved))thresholdState=saved;
  }
  uint8_t g; EEPROM.get(8,g); guardFloat=g;
  EEPROM.get(10,settleUs); EEPROM.get(12,gapMs);
  uint8_t e; EEPROM.get(14,e); emaOn=e;
  EEPROM.get(15,emaAlphaPct);
  EEPROM.get(16,patBuckle); EEPROM.get(17,patHook); EEPROM.get(18,patManual);
  EEPROM.get(20,freqBuckle); EEPROM.get(22,freqHook); EEPROM.get(24,freqManual);
  uint8_t p; EEPROM.get(26,p); predictOn=p;
  EEPROM.get(28,mutShortMax); EEPROM.get(30,mutBridgeMax);
  EEPROM.get(32,baseA); EEPROM.get(34,baseB);
  uint8_t b; EEPROM.get(36,b); buzzEnabled=b;
  EEPROM.get(37,buzzVol); EEPROM.get(38,hookDelta); EEPROM.get(40,gain);
  if(thresholdA>100000 || thresholdB>100000){ thresholdA=0; thresholdB=0; hookAlarmEnabled=false; }
  if(emaAlphaPct<1||emaAlphaPct>100) emaAlphaPct=20;
  if(patBuckle>=NPATS) patBuckle=0;
  if(patHook>=NPATS) patHook=1;
  if(patManual>=NPATS) patManual=2;
  if(buzzVol>100) buzzVol=100;
  if(gain<1||gain>10) gain=1;
  if(hookDelta<20||hookDelta>3000) hookDelta=250;
}
bool saveConfig(){
  EEPROM.put(0,EE_MAGIC);
  EEPROM.put(44,thresholdA); EEPROM.put(48,thresholdB); EEPROM.put(52,(uint8_t)hookAlarmEnabled);
  EEPROM.put(8,(uint8_t)guardFloat); EEPROM.put(10,settleUs); EEPROM.put(12,gapMs);
  EEPROM.put(14,(uint8_t)emaOn); EEPROM.put(15,emaAlphaPct);
  EEPROM.put(16,patBuckle); EEPROM.put(17,patHook); EEPROM.put(18,patManual);
  EEPROM.put(20,freqBuckle); EEPROM.put(22,freqHook); EEPROM.put(24,freqManual);
  EEPROM.put(26,(uint8_t)predictOn); EEPROM.put(28,mutShortMax); EEPROM.put(30,mutBridgeMax);
  EEPROM.put(32,baseA); EEPROM.put(34,baseB);
  EEPROM.put(36,(uint8_t)buzzEnabled); EEPROM.put(37,buzzVol);
  EEPROM.put(38,hookDelta); EEPROM.put(40,gain);
  EEPROM.put(56,thresholdState);EEPROM.put(80,thresholdChecksum(thresholdState));EEPROM.put(84,(uint32_t)0x54485236);
  return EEPROM.commit();
}

volatile bool otaBusy=false;

void buzzOn(uint16_t f){
  (void)f; // Active buzzers do not use the passive-piezo frequency parameter.
  if(!buzzEnabled||buzzVol==0){ buzzerState=false; return; }
#if PASSIVE_PIEZO
  analogWriteRange(1023);
  analogWriteFreq(f);
  analogWrite(BUZZER_PIN, (int)(buzzVol*5.11));
#else
  if(buzzVol>=100) digitalWrite(BUZZER_PIN,HIGH);
  else { analogWriteRange(1023); analogWriteFreq(20000); analogWrite(BUZZER_PIN,(int)(buzzVol*10.23)); }
#endif
  buzzerState=true;
}
void buzzOff(){
  analogWrite(BUZZER_PIN,0);
  digitalWrite(BUZZER_PIN,LOW);
  buzzerState=false;
}
uint8_t patFor(AlarmMode m){ return m==ALARM_BUCKLE?patBuckle:m==ALARM_HOOK?patHook:patManual; }
uint16_t freqFor(AlarmMode m){ return m==ALARM_BUCKLE?freqBuckle:m==ALARM_HOOK?freqHook:freqManual; }

HookState rawState=ST_FREE;
HookState stableState=ST_FREE;
uint8_t hist[7]={0,0,0,0,0,0,0}, histI=0;
const char* stName(HookState s){ return s==ST_SHORT?"STRONG LINK":s==ST_HUMAN?"WEAK LINK":s==ST_CONTACT?"CONTACT":"FREE"; }
uint8_t hkA=0, hkB=0;
const char* hkName(uint8_t h){
  if(validCalibration(calibration))return h==3?"UNCERTAIN":h==1?(calibration.mode==1?"HAND-LIKE":"METAL-LIKE"):"BASELINE";
  return h==2?"BELOW BASE":h==1?"ABOVE BASE":"NEAR BASE";
}
bool predictionValid(){return mutualValid && hookA.valid && hookB.valid && hkA!=3 && hkB!=3;}
const char* predictionName(){return !predictOn?"OFF":predictionValid()?stName(stableState):"UNKNOWN";}

HookState classify(){
  if(!mutualValid || !hookA.valid || !hookB.valid) return ST_FREE;
  if(mutualAB<mutShortMax) return ST_SHORT;
  if(mutualAB<mutBridgeMax) return ST_HUMAN;
  if((hkA&&hkA!=3)||(hkB&&hkB!=3)) return ST_CONTACT;
  return ST_FREE;
}
void updateState(){
  bool calibrated=validCalibration(calibration);
  uint32_t referenceBaseA=calibrated?calibration.baselineA:baseA;
  uint32_t referenceBaseB=calibrated?calibration.baselineB:baseB;
  loadA=((int32_t)dispA-(int32_t)referenceBaseA)*gain;
  loadB=((int32_t)dispB-(int32_t)referenceBaseB)*gain;
  int32_t dA=(int32_t)dispA-(int32_t)referenceBaseA,dB=(int32_t)dispB-(int32_t)referenceBaseB;
  if(calibrated){
    HookMatch a=calibratedHook(dispA,calibration.baselineA,calibration.deltaA,calibration.directionA);
    HookMatch b=calibratedHook(dispB,calibration.baselineB,calibration.deltaB,calibration.directionB);
    hkA=a==REFERENCE?1:a==BASELINE?0:3;hkB=b==REFERENCE?1:b==BASELINE?0:3;
  }else{
    hkA=dA<-(int32_t)hookDelta?2:dA>(int32_t)hookDelta?1:0;
    hkB=dB<-(int32_t)hookDelta?2:dB>(int32_t)hookDelta?1:0;
  }
  rawState=classify();
  if(!predictionValid()){
    memset(hist,0,sizeof(hist)); stableState=ST_FREE; return;
  }
  hist[histI]=(uint8_t)rawState; histI=(histI+1)%7;
  uint8_t c[4]={0,0,0,0};
  for(int i=0;i<7;i++) c[hist[i]]++;
  if(c[ST_SHORT]>=2) stableState=ST_SHORT;
  else if(c[ST_HUMAN]>=2) stableState=ST_HUMAN;
  else if(c[ST_CONTACT]>=3) stableState=ST_CONTACT;
  else stableState=ST_FREE;
}

void updateBattery(){
  battVoltage=(analogRead(A0)/1023.0)*7.276;
  if(battVoltage>=4.2)battPercent=100; else if(battVoltage<=3.2)battPercent=0;
  else battPercent=(int)(((battVoltage-3.2)/(4.2-3.2))*100.0);
}
bool updateBuckles(){
  int pins[3]={BUCKLE1_PIN,BUCKLE2_PIN,BUCKLE3_PIN};unsigned long now=millis();bool anyOpen=false;
  for(int i=0;i<3;i++){bool rd=digitalRead(pins[i]);
    if(rd!=lastReading[i])debounceTime[i]=now;
    if((now-debounceTime[i])>DEBOUNCE_MS){if(rd!=buckleState[i])buckleState[i]=rd;}
    lastReading[i]=rd; if(buckleState[i])anyOpen=true;}
  return anyOpen;
}
const char* modeName(AlarmMode m){return m==ALARM_SENSOR?"SENSOR":m==ALARM_BUCKLE?"BUCKLE":m==ALARM_HOOK?"HOOK":m==ALARM_MANUAL?"MANUAL":"NONE";}

#include "device_dashboard.h"

void pump(){
#if ENABLE_ARDUINO_OTA
  ArduinoOTA.handle();
#endif
  dnsServer.processNextRequest(); MDNS.update(); server.handleClient(); yield();
}

// Serve exactly the same self-contained dashboard on both network interfaces.
void showSettingsPage(){
  server.sendHeader("Cache-Control","no-store");
  server.send_P(200,"text/html",INDEX_HTML);
}
String jsonString(const char* text){
  String result="\"";
  for(const unsigned char* p=(const unsigned char*)text;*p;p++){
    if(*p=='"'||*p=='\\'){ result+='\\'; result+=(char)*p; }
    else if(*p<32){ char escape[7]; snprintf(escape,sizeof(escape),"\\u%04x",*p); result+=escape; }
    else result+=(char)*p;
  }
  return result+"\"";
}
#include "network_runtime.h"
bool parseThresholdArg(const char* name, uint32_t& value){
  if(!server.hasArg(name)) return false;
  String raw=server.arg(name);
  if(raw.length()==0 || raw.length()>6) return false;
  for(unsigned i=0;i<raw.length();i++) if(raw[i]<'0'||raw[i]>'9') return false;
  value=(uint32_t)raw.toInt(); return value<=100000;
}

#include "tuning_transaction.h"
#include "device_runtime.h"

void setupEndpoints(){
  server.on("/device",HTTP_POST,saveDevicePreferences);
  server.on("/calibration",HTTP_POST,handleCalibration);
  server.on("/diagnostics",HTTP_GET,showDiagnostics);
  server.on("/connect", showSettingsPage);
  server.on("/wifi", HTTP_GET, showWifiStatus);
  server.on("/wifi", HTTP_POST, saveRouterWifi);
  // Manual-open portal: successful OS probes stop recurring captive-browser popups.
  server.on("/generate_204", [](){server.send(204,"text/plain","");});
  server.on("/gen_204", [](){server.send(204,"text/plain","");});
  server.on("/hotspot-detect.html", [](){server.send(200,"text/html","<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");});
  server.on("/library/test/success.html", [](){server.send(200,"text/html","<HTML><HEAD><TITLE>Success</TITLE></HEAD><BODY>Success</BODY></HTML>");});
  server.on("/connecttest.txt", [](){server.send(200,"text/plain","Microsoft Connect Test");});
  server.on("/ncsi.txt", [](){server.send(200,"text/plain","Microsoft NCSI");});
  server.on("/favicon.ico", [](){server.send(204,"text/plain","");});
  server.onNotFound([](){server.send(404,"text/plain","Open http://192.168.4.1/ for SBox settings");});
  server.on("/thresholds", HTTP_POST, [](){
    uint32_t a,b,expected=0;
    String raw=server.arg("expected_revision");
    bool valid=raw.length()>0 && raw.length()<=10;
    uint64_t parsed=0;
    for(unsigned i=0;i<raw.length();i++){if(raw[i]<'0'||raw[i]>'9')valid=false;else parsed=parsed*10+(raw[i]-'0');}
    if(parsed>UINT32_MAX)valid=false;expected=(uint32_t)parsed;
    if(!valid || !parseThresholdArg("threshold_a",a)||!parseThresholdArg("threshold_b",b)){
      server.send(400,"text/plain","Two integer limits (0-100000) and expected_revision required");return;
    }
    bool local=server.arg("source")=="device";
    ThresholdState previous=thresholdState;
    if(!updateThresholds(thresholdState,a,b,expected,local)){
      server.send(409,"text/plain","Thresholds changed. Refresh values before saving again.");return;
    }
    if(memcmp(&previous,&thresholdState,sizeof(previous))!=0 && !saveConfig()){
      thresholdState=previous;
      EEPROM.put(44,thresholdA);EEPROM.put(48,thresholdB);EEPROM.put(52,(uint8_t)hookAlarmEnabled);
      EEPROM.put(56,previous);EEPROM.put(80,thresholdChecksum(previous));
      server.send(500,"text/plain","Thresholds could not be saved");return;
    }
    hookViolation=hooksExceeded(hookA.valid?(int32_t)dispA:-1,hookB.valid?(int32_t)dispB:-1,thresholdA,thresholdB,hookAlarmEnabled);
    server.send(200,"application/json","{\"saved\":true}");
  });
  server.on("/", showSettingsPage);

  server.on("/config", [](){
    TuningSnapshot previous=captureTuning();
    bool ch=false;
    if(server.hasArg("thresh")){ server.send(409,"text/plain","Hook limits are managed by the Elevox website"); return; }
    if(server.hasArg("guard")){ server.send(409,"text/plain","V6 guard is fixed HIGH"); return; }
    if(server.hasArg("settle")){ settleUs=constrain(server.arg("settle").toInt(),0,20000); ch=true; }
    if(server.hasArg("gap")){ gapMs=constrain(server.arg("gap").toInt(),0,200); ch=true; }
    if(server.hasArg("ema")){ emaOn=server.arg("ema").toInt()!=0; emaA=-1; emaB=-1; ch=true; }
    if(server.hasArg("alpha")){ emaAlphaPct=constrain(server.arg("alpha").toInt(),1,100); ch=true; }
    if(server.hasArg("predict")){ predictOn=server.arg("predict").toInt()!=0; ch=true; }
    if(server.hasArg("msh")){ mutShortMax=constrain(server.arg("msh").toInt(),1,11999); ch=true; }
    if(server.hasArg("mbr")){ mutBridgeMax=constrain(server.arg("mbr").toInt(),1,12000); ch=true; }
    if(server.hasArg("pb")){ patBuckle=constrain(server.arg("pb").toInt(),0,NPATS-1); ch=true; }
    if(server.hasArg("ph")){ patHook=constrain(server.arg("ph").toInt(),0,NPATS-1); ch=true; }
    if(server.hasArg("pm")){ patManual=constrain(server.arg("pm").toInt(),0,NPATS-1); ch=true; }
    if(server.hasArg("baseA")){ baseA=constrain(server.arg("baseA").toInt(),1,39999); ch=true; }
    if(server.hasArg("baseB")){ baseB=constrain(server.arg("baseB").toInt(),1,39999); ch=true; }
    if(server.hasArg("buzz")){ buzzEnabled=server.arg("buzz").toInt()!=0; ch=true; }
    if(server.hasArg("vol")){ buzzVol=constrain(server.arg("vol").toInt(),0,100); ch=true; }
    if(server.hasArg("gain")){ gain=constrain(server.arg("gain").toInt(),1,10); ch=true; }
    if(server.hasArg("hd")){ hookDelta=constrain(server.arg("hd").toInt(),20,3000); ch=true; }
    if(ch && !commitTuning(previous)){ server.send(500,"text/plain","Configuration could not be persisted; previous settings retained"); return; }
    if(ch && (!buzzEnabled || buzzVol==0))buzzOff();
    if(ch && !predictOn){memset(hist,0,sizeof(hist));stableState=rawState=ST_FREE;}
    server.send(200,"text/plain","ok");
  });

  server.on("/trigger", [](){
    if(!alarmActive){ alarmActive=true; alarmStartTime=millis(); }
    server.send(200,"text/plain","ACK");
  });

  server.on("/data", [](){
    bool up=(WiFi.status()==WL_CONNECTED);
    char sip[20]; if(up) strncpy(sip,WiFi.localIP().toString().c_str(),sizeof(sip)); else strcpy(sip,"-");
    sip[sizeof(sip)-1]=0;
    char aip[20]; strncpy(aip,WiFi.softAPIP().toString().c_str(),sizeof(aip)); aip[sizeof(aip)-1]=0;
    static char buf[2600];
    snprintf(buf,sizeof(buf),
      "{\"device_name\":\"%s\",\"light_mode\":%s,\"sample_seq\":%u,\"sample_uptime_ms\":%u,\"sample_age_ms\":%u,\"uptime_ms\":%u,"
      "\"prediction_calibrated\":%s,\"calibration_mode\":\"%s\",\"calibration_capture_mode\":\"%s\",\"calibration_running\":%s,\"calibration_step\":%u,\"calibration_completed\":%u,\"calibration_remaining_ms\":%u,\"calibration_error\":\"%s\","
      "\"threshold_edit_revision\":%u,\"threshold_edit_pending\":%s,\"threshold_base_a\":%u,\"threshold_base_b\":%u,\"threshold_base_valid\":%s,"
      "\"protocol\":\"elevox-v5/1\",\"firmware\":\"v6.2.0\",\"mutual_valid\":%s,\"a_timeouts\":%u,\"b_timeouts\":%u,\"id\":\"%s\",\"guard\":\"%s\",\"raw1\":%d,\"raw2\":%d,\"a_p2p\":%u,\"b_p2p\":%u,"
      "\"loadA\":%d,\"loadB\":%d,\"link\":%d,\"hkA\":%u,\"hkB\":%u,\"hkAn\":\"%s\",\"hkBn\":\"%s\","
      "\"batt_pct\":%d,\"batt_v\":%.2f,\"b1\":%s,\"b2\":%s,\"b3\":%s,"
      "\"threshold_a\":%u,\"threshold_b\":%u,\"hook_alarm_enabled\":%s,\"hook_a_valid\":%s,\"hook_b_valid\":%s,\"hookviol\":%s,\"mutual\":%u,\"state\":\"%s\","
      "\"ema\":%s,\"alpha\":%u,\"predict\":%s,\"msh\":%u,\"mbr\":%u,\"hd\":%u,\"gain\":%u,"
      "\"baseA\":%u,\"baseB\":%u,\"pb\":%u,\"ph\":%u,\"pm\":%u,"
      "\"buzz\":%s,\"vol\":%u,\"passive\":%s,"
      "\"alarm\":%s,\"mode\":\"%s\",\"sta_up\":%s,\"sta_ip\":\"%s\",\"ap_ip\":\"%s\","
      "\"rssi\":%d,\"heap\":%u,\"host\":\"%s.local\"}",
      preferences.name,preferences.light?"true":"false",sampleSequence,sampleStamp,sampleSequence?(uint32_t)(millis()-sampleStamp):UINT32_MAX,(uint32_t)millis(),
      validCalibration(calibration)?"true":"false",validCalibration(calibration)?(calibration.mode==1?"hand":"metal"):"none",
      calibrationSession.mode()==1?"hand":calibrationSession.mode()==2?"metal":"none",calibrationSession.running()?"true":"false",(unsigned)calibrationSession.step(),(unsigned)calibrationSession.completedSteps(),calibrationSession.remainingMs(millis()),
      calibrationSaveError[0]?calibrationSaveError:calibrationSession.error(),
      thresholdState.revision,thresholdState.pending?"true":"false",thresholdState.baseA,thresholdState.baseB,thresholdState.baseValid?"true":"false",
      mutualValid?"true":"false",(unsigned)hookA.timeouts,(unsigned)hookB.timeouts,
      sboxID, "HIGH",
      hookA.valid?(int)dispA:-1,hookB.valid?(int)dispB:-1,(unsigned)hookA.p2p,(unsigned)hookB.p2p,
      (int)loadA,(int)loadB,(int)linkIdx,(unsigned)hkA,(unsigned)hkB,hkName(hkA),hkName(hkB),
      battPercent,battVoltage,
      (!buckleState[0])?"true":"false",(!buckleState[1])?"true":"false",(!buckleState[2])?"true":"false",
      thresholdA,thresholdB,hookAlarmEnabled?"true":"false",hookA.valid?"true":"false",hookB.valid?"true":"false", hookViolation?"true":"false",(unsigned)mutualAB, predictionName(),
      emaOn?"true":"false",(unsigned)emaAlphaPct,predictOn?"true":"false",
      (unsigned)mutShortMax,(unsigned)mutBridgeMax,(unsigned)hookDelta,(unsigned)gain,
      (unsigned)baseA,(unsigned)baseB,(unsigned)patBuckle,(unsigned)patHook,(unsigned)patManual,
      buzzEnabled?"true":"false",(unsigned)buzzVol, PASSIVE_PIEZO?"true":"false",
      curMode!=ALARM_NONE?"true":"false", modeName(curMode), up?"true":"false", sip, aip,
      up?WiFi.RSSI():0, (unsigned)ESP.getFreeHeap(), MDNS_NAME);
    server.sendHeader("Cache-Control","no-store");
    server.send(200,"application/json",buf);
  });
}

void setup(){
  Serial.begin(115200);
  int bucklePins[]={BUCKLE1_PIN,BUCKLE2_PIN,BUCKLE3_PIN};
  for(int i=0;i<3;i++){
    pinMode(bucklePins[i],bucklePins[i]==16?INPUT:INPUT_PULLUP);
    buckleState[i]=lastReading[i]=digitalRead(bucklePins[i]);
  }
  pinMode(LED_PIN,OUTPUT); pinMode(BUZZER_PIN,OUTPUT);
  digitalWrite(LED_PIN,LOW); digitalWrite(BUZZER_PIN,LOW);
  loadConfig();
  loadRouterWifi();
  WiFi.persistent(false);
  snprintf(MDNS_NAME,sizeof(MDNS_NAME),"sbox-%06x",ESP.getChipId());
  apName=String("SBox-")+String(ESP.getChipId(),HEX);
  loadDevicePreferences();
  EEPROM.get(1152,calibration);if(!validCalibration(calibration))calibration=PredictionCalibration{};
  WiFi.mode(WIFI_AP_STA);
  WiFi.setSleepMode(WIFI_NONE_SLEEP);
  WiFi.setAutoReconnect(false);
  WiFi.disconnect(false); // stop any SDK startup attempt before our bounded scheduler takes over
  startHotspot();
  // Automatic association waits until no AP client is configuring. Explicit Connect overrides this.
  wifiRetry.stamp=millis();wifiRetry.waitMs=5000;
  // Do not wait for a router: hotspot and local alarms must work immediately.
  httpUpdater.setup(&server,"/update");
  setupEndpoints();
  server.begin();
#if ENABLE_ARDUINO_OTA
  ArduinoOTA.setHostname(MDNS_NAME);

  ArduinoOTA.onStart([](){ otaBusy=true; buzzOff(); digitalWrite(LED_PIN,HIGH); });
  ArduinoOTA.onEnd([](){ otaBusy=false; });
  ArduinoOTA.onError([](ota_error_t e){ (void)e; otaBusy=false; });
  ArduinoOTA.begin();
  MDNS.addService("http","tcp",80);
#else
  if(MDNS.begin(MDNS_NAME)) MDNS.addService("http","tcp",80);
#endif
}

// Commit the whole A/B frame together; HTTP never observes half-updated readings.
void advanceSensing(uint32_t now){
  if(sensingPhase==0){
    if(sampleSequence && (uint32_t)(now-frameStarted)<SENSE_PERIOD_MS)return;
    frameStarted=now;hookSampler.begin(HOOK_A_PIN,HOOK_B_PIN);sensingPhase=1;
  }
  if(sensingPhase==1){
    if(hookSampler.step()){nextHookA=hookSampler.result();hookSampler.begin(HOOK_B_PIN,HOOK_A_PIN);sensingPhase=2;}
    return;
  }
  if(sensingPhase==2){
    if(!hookSampler.step())return;
    hookA=nextHookA;hookB=hookSampler.result();
    // Link Index is a measurement, independent of whether prediction is enabled.
    mutualAB=readMutual(HOOK_A_PIN,HOOK_B_PIN,mutualValid);
    bridged=mutualValid && mutualAB<MUTUAL_CEIL;
    linkIdx=mutualValid&&mutualAB?1000000UL/mutualAB:0;
    if(emaOn){
      emaA=smoothHook(emaA,hookA.valid?(int32_t)hookA.mean:-1,emaAlphaPct);
      emaB=smoothHook(emaB,hookB.valid?(int32_t)hookB.mean:-1,emaAlphaPct);
      dispA=hookA.valid?(uint32_t)emaA:0;dispB=hookB.valid?(uint32_t)emaB:0;
    }else{emaA=emaB=-1;dispA=hookA.mean;dispB=hookB.mean;}
    if(predictOn)updateState();
    hookViolation=hooksExceeded(hookA.valid?(int32_t)dispA:-1,hookB.valid?(int32_t)dispB:-1,thresholdA,thresholdB,hookAlarmEnabled);
    sampleSequence++;if(!sampleSequence)sampleSequence=1;
    sampleStamp=millis();frameDuration=sampleStamp-frameStarted;
    calibrationSession.observe(sampleStamp,hookA.mean,hookB.mean,hookA.valid,hookB.valid);
    sensingPhase=0;
    static uint32_t lastLog=0;
    if((uint32_t)(sampleStamp-lastLog)>=5000){
      lastLog=sampleStamp;
      Serial.printf("[STREAM] sample=%u frame=%ums A=%d B=%d heap=%u\n",sampleSequence,frameDuration,hookA.valid?(int)dispA:-1,hookB.valid?(int)dispB:-1,ESP.getFreeHeap());
    }
  }
}

void loop(){
#if ENABLE_ARDUINO_OTA
  if(otaBusy){ ArduinoOTA.handle(); yield(); return; }
#endif
  pump();
  serviceWifi();
  unsigned long now=millis();

  serviceDeviceSettings();
  advanceSensing(now);
  serviceCalibration();

  now=millis(); // pump() may have accepted a manual trigger during sensing.
  if(now-lastBatteryRead>2000){ lastBatteryRead=now; updateBattery(); }
  bool anyOpen=updateBuckles();
  if(alarmActive && pulseExpired(now,alarmStartTime)) alarmActive=false;

  AlarmMode want=anyOpen?ALARM_BUCKLE:(!hookA.valid||!hookB.valid)?ALARM_SENSOR:hookViolation?ALARM_HOOK:alarmActive?ALARM_MANUAL:ALARM_NONE;
  if(want!=curMode){
    curMode=want; patIdx=0; patStamp=now; lastBuzzerToggle=now; buckleAlarmStart=now;
    if(want==ALARM_NONE) buzzOff(); else buzzOn(freqFor(want));
  }
  if(curMode!=ALARM_NONE){
    uint8_t pi=patFor(curMode);
    if(pi==0){
      unsigned long el=now-buckleAlarmStart;
      long iv=constrain(map(el,0,10000,600,40),40,600);
      if(now-lastBuzzerToggle>=(unsigned long)iv){ lastBuzzerToggle=now; if(buzzerState)buzzOff(); else buzzOn(freqFor(curMode)); }
    } else {
      const Pat& p=PATS[pi];
      if(now-patStamp>=p.d[patIdx]){ patStamp=now; patIdx=(patIdx+1)%p.n; if(patIdx%2==0) buzzOn(freqFor(curMode)); else buzzOff(); }
    }
  }
  digitalWrite(LED_PIN, SBOX_SCHEMATIC_PINOUT ? (curMode==ALARM_NONE?HIGH:LOW) : (curMode==ALARM_NONE?LOW:HIGH));

  serviceWifi();
}
