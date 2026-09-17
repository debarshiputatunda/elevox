#include "legacy_config.h"
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <ESP8266HTTPUpdateServer.h>
#include <ArduinoOTA.h>
#include <EEPROM.h>

const char* STA_SSID = ELEVOX_LOCAL_STA_SSID;
const char* STA_PASS = ELEVOX_LOCAL_STA_PASS;
const char* AP_SSID = ELEVOX_LOCAL_AP_SSID;
const char* AP_PASS = ELEVOX_LOCAL_AP_PASS;
const char* ADMIN_USER = ELEVOX_LOCAL_ADMIN_USER;
const char* ADMIN_PASS = ELEVOX_LOCAL_ADMIN_PASS;
const char* sboxID    = "SBOX-2026-6265";
const char* MDNS_NAME = "sbox-2026-6265";
#define ENABLE_ARDUINO_OTA 1

const int HOOK_A_PIN = 5, HOOK_B_PIN = 4;
#define BUCKLE1_PIN 13
#define BUCKLE2_PIN 14
#define BUCKLE3_PIN 16
#define LED_PIN     2
#define BUZZER_PIN  12
#define PASSIVE_PIEZO 0

enum HookState {
  ST_FREE,
  ST_CONTACT,
  ST_HUMAN,
  ST_SHORT
};

ESP8266WebServer server(80);
ESP8266HTTPUpdateServer httpUpdater;

const uint32_t DISCHARGE_CEIL = 40000;
const int CAP_SAMPLES = 24, CHARGE_US = 60, SAMPLE_GAP_US = 800;
const uint32_t MUTUAL_CEIL = 12000;
const int MUTUAL_DISCHARGE_US = 30, MUTUAL_SAMPLES = 12;
const unsigned long SENSE_PERIOD_MS = 120;

struct CapStat { uint32_t med; uint32_t p2p; uint32_t mean; };
CapStat hookA={0,0,0}, hookB={0,0,0};
float emaA=-1, emaB=-1;
uint32_t dispA=0, dispB=0, mutualAB=MUTUAL_CEIL;
int32_t loadA=0, loadB=0, linkIdx=0;
bool bridged=false;

float battVoltage=0.0; int battPercent=0; unsigned long lastBatteryRead=0;
bool buckleState[3]={true,true,true}, lastReading[3]={true,true,true};
unsigned long debounceTime[3]={0,0,0};
const int DEBOUNCE_MS=50;

enum AlarmMode { ALARM_NONE, ALARM_MANUAL, ALARM_HOOK, ALARM_BUCKLE };
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

int hookThreshold=0;
bool guardFloat=false;
uint16_t settleUs=3000, gapMs=5;
bool emaOn=false; uint8_t emaAlphaPct=20;
uint8_t patBuckle=0, patHook=1, patManual=2;
uint16_t freqBuckle=4000, freqHook=2200, freqManual=3000;
bool predictOn=true, buzzEnabled=true;
uint8_t buzzVol=100;
uint16_t mutShortMax=380, mutBridgeMax=1000;
uint16_t baseA=1566, baseB=1524;
uint16_t hookDelta=250;
uint8_t gain=1;

const uint32_t EE_MAGIC=0x5B0C0020;
void loadConfig(){
  EEPROM.begin(96);
  uint32_t m; EEPROM.get(0,m);
  if(m!=EE_MAGIC) return;
  EEPROM.get(4,hookThreshold);
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
  if(hookThreshold<0||hookThreshold>39999) hookThreshold=0;
  if(emaAlphaPct<1||emaAlphaPct>100) emaAlphaPct=20;
  if(patBuckle>=NPATS) patBuckle=0;
  if(patHook>=NPATS) patHook=1;
  if(patManual>=NPATS) patManual=2;
  if(buzzVol>100) buzzVol=100;
  if(gain<1||gain>10) gain=1;
  if(hookDelta<20||hookDelta>3000) hookDelta=250;
}
void saveConfig(){
  EEPROM.put(0,EE_MAGIC); EEPROM.put(4,hookThreshold);
  EEPROM.put(8,(uint8_t)guardFloat); EEPROM.put(10,settleUs); EEPROM.put(12,gapMs);
  EEPROM.put(14,(uint8_t)emaOn); EEPROM.put(15,emaAlphaPct);
  EEPROM.put(16,patBuckle); EEPROM.put(17,patHook); EEPROM.put(18,patManual);
  EEPROM.put(20,freqBuckle); EEPROM.put(22,freqHook); EEPROM.put(24,freqManual);
  EEPROM.put(26,(uint8_t)predictOn); EEPROM.put(28,mutShortMax); EEPROM.put(30,mutBridgeMax);
  EEPROM.put(32,baseA); EEPROM.put(34,baseB);
  EEPROM.put(36,(uint8_t)buzzEnabled); EEPROM.put(37,buzzVol);
  EEPROM.put(38,hookDelta); EEPROM.put(40,gain);
  EEPROM.commit();
}

volatile bool otaBusy=false;

void buzzOn(uint16_t f){
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

uint32_t capRawOnce(uint8_t pin){
  pinMode(pin,OUTPUT); digitalWrite(pin,HIGH); delayMicroseconds(CHARGE_US);
  noInterrupts(); pinMode(pin,INPUT);
  uint32_t t0=ESP.getCycleCount(),t=t0;
  while((GPI&(1u<<pin))&&(t-t0<DISCHARGE_CEIL)) t=ESP.getCycleCount();
  interrupts(); return t-t0;
}
CapStat capRawBurst(uint8_t pin, uint8_t otherPin){
  if(guardFloat) pinMode(otherPin,INPUT);
  else { pinMode(otherPin,OUTPUT); digitalWrite(otherPin,LOW); }
  uint32_t st=settleUs;
  while(st){ uint16_t c=st>1000?1000:st; delayMicroseconds(c); st-=c; yield(); }
  uint32_t s[CAP_SAMPLES]; uint64_t sum=0;
  for(int i=0;i<CAP_SAMPLES;i++){s[i]=capRawOnce(pin);sum+=s[i];delayMicroseconds(SAMPLE_GAP_US);yield();}
  for(int i=1;i<CAP_SAMPLES;i++){uint32_t k=s[i];int j=i-1;while(j>=0&&s[j]>k){s[j+1]=s[j];j--;}s[j+1]=k;}
  CapStat r; r.med=(s[CAP_SAMPLES/2-1]+s[CAP_SAMPLES/2])/2; r.p2p=s[CAP_SAMPLES-2]-s[1]; r.mean=(uint32_t)(sum/CAP_SAMPLES);
  return r;
}
float capToPF(uint32_t c){const float F=80.0e6,R=100000.0,LN=1.40;return ((c/F)/(R*LN))*1.0e12;}

uint32_t readMutualOnce(uint8_t dp, uint8_t sp){
  pinMode(dp,OUTPUT); digitalWrite(dp,LOW);
  pinMode(sp,OUTPUT); digitalWrite(sp,LOW);
  delayMicroseconds(MUTUAL_DISCHARGE_US);
  pinMode(sp,INPUT);
  noInterrupts();
  digitalWrite(dp,HIGH);
  uint32_t t0=ESP.getCycleCount(),t=t0;
  while(!(GPI&(1u<<sp)) && (t-t0<MUTUAL_CEIL)) t=ESP.getCycleCount();
  interrupts();
  return t-t0;
}
uint32_t readMutual(uint8_t dp, uint8_t sp){
  uint32_t s[MUTUAL_SAMPLES];
  for(int i=0;i<MUTUAL_SAMPLES;i++){ s[i]=readMutualOnce(dp,sp); delayMicroseconds(400); yield(); }
  for(int i=1;i<MUTUAL_SAMPLES;i++){uint32_t k=s[i];int j=i-1;while(j>=0&&s[j]>k){s[j+1]=s[j];j--;}s[j+1]=k;}
  return (s[MUTUAL_SAMPLES/2-1]+s[MUTUAL_SAMPLES/2])/2;
}



HookState rawState=ST_FREE;
HookState stableState=ST_FREE;
uint8_t hist[7]={0,0,0,0,0,0,0}, histI=0;
const char* stName(HookState s){ return s==ST_SHORT?"SHORTED":s==ST_HUMAN?"BODY LINK":s==ST_CONTACT?"CONTACT":"FREE"; }
uint8_t hkA=0, hkB=0;
const char* hkName(uint8_t h){ return h==2?"GROUNDED":h==1?"LOADED":"CLEAR"; }

HookState classify(){
  if(mutualAB<mutShortMax) return ST_SHORT;
  if(mutualAB<mutBridgeMax) return ST_HUMAN;
  if(hkA||hkB) return ST_CONTACT;
  return ST_FREE;
}
void updateState(){
  loadA=((int32_t)dispA-(int32_t)baseA)*gain;
  loadB=((int32_t)dispB-(int32_t)baseB)*gain;
  linkIdx = (mutualAB>0) ? (int32_t)(1000000UL/mutualAB) : 0;
  int32_t dA=(int32_t)dispA-(int32_t)baseA, dB=(int32_t)dispB-(int32_t)baseB;
  hkA = (dA < -(int32_t)hookDelta) ? 2 : (dA > (int32_t)hookDelta) ? 1 : 0;
  hkB = (dB < -(int32_t)hookDelta) ? 2 : (dB > (int32_t)hookDelta) ? 1 : 0;
  rawState=classify();
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
const char* modeName(AlarmMode m){return m==ALARM_BUCKLE?"BUCKLE":m==ALARM_HOOK?"HOOK":m==ALARM_MANUAL?"MANUAL":"NONE";}

const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>SBOX</title>
<style>
:root{--bg:#14161A;--pnl:#1C2026;--pnl2:#23282F;--amb:#FFA51F;--stl:#5C6B7A;--txt:#E4E7EB;--mut:#8A949F;--ok:#4ADE6A;--bad:#E8412F;--cy:#3FC1D9;--br:#2E343D;--ln:#3A424D}
*{box-sizing:border-box}
body{margin:0;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;background:var(--bg);color:var(--txt);font-size:13px}
header{display:flex;align-items:center;gap:12px;padding:10px 16px;background:var(--pnl);border-bottom:3px solid var(--amb);position:sticky;top:0;z-index:9}
header h1{font-size:15px;margin:0;font-weight:700;letter-spacing:3px}
.dot{width:8px;height:8px;background:var(--bad)}.dot.on{background:var(--ok)}
.id{color:var(--mut);font-size:11px}
.wrap{padding:14px;max-width:900px;margin:0 auto}
.strip{height:6px;background:repeating-linear-gradient(45deg,var(--amb),var(--amb) 10px,#14161A 10px,#14161A 20px);margin-bottom:14px}
.net{font-size:11px;color:var(--mut);margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap}
.box{background:var(--pnl);border:1px solid var(--br);border-left:3px solid var(--stl)}
.box h2{font-size:10px;margin:0;padding:7px 12px;background:var(--pnl2);color:var(--amb);letter-spacing:2px;font-weight:700;border-bottom:1px solid var(--br)}
.box .bd{padding:12px}
.state{padding:18px 12px;text-align:center;margin-bottom:12px;border-left-width:6px}
.state .lbl{font-size:10px;letter-spacing:3px;color:var(--mut)}
.state .v{font-size:36px;font-weight:700;letter-spacing:2px;margin:6px 0 3px}
.state .exp{font-size:11px;color:var(--mut)}
.state.free{border-left-color:var(--ok)}.state.free .v{color:var(--ok)}
.state.human{border-left-color:var(--amb)}.state.human .v{color:var(--amb)}
.state.short{border-left-color:var(--cy)}.state.short .v{color:var(--cy)}
.state.contact{border-left-color:var(--stl)}.state.contact .v{color:var(--stl)}
.state.off{opacity:.4}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.mtr{padding:10px 12px}
.mtr .t{font-size:10px;color:var(--mut);letter-spacing:1.5px;display:flex;justify-content:space-between}
.mtr .n{font-size:26px;font-weight:700;margin:3px 0}
.mtr .s{font-size:10px;color:var(--mut)}
.trk{height:8px;background:#0E1013;margin-top:6px;position:relative;overflow:hidden}
.fl{height:100%;transition:width .18s}
.tag{font-size:9px;padding:2px 6px;letter-spacing:1px;font-weight:700}
.t-ok{background:rgba(74,222,106,.15);color:var(--ok)}.t-amb{background:rgba(255,165,31,.15);color:var(--amb)}
.t-cy{background:rgba(63,193,217,.15);color:var(--cy)}.t-mut{background:#23282F;color:var(--mut)}
.bkrow{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.bk{padding:10px 6px;text-align:center;border:1px solid var(--br);background:#0E1013}
.bk .bn{font-size:9px;color:var(--mut);letter-spacing:1px}
.bk .bs{font-size:14px;font-weight:700;margin-top:3px}
.bk.lk{border-color:rgba(74,222,106,.4)}.bk.lk .bs{color:var(--ok)}
.bk.op{border-color:var(--bad);background:rgba(232,65,47,.1)}.bk.op .bs{color:var(--bad)}
canvas{width:100%;height:160px;background:var(--pnl);border:1px solid var(--br);display:block;margin-bottom:12px}
.kv{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:var(--mut)}
.kv b{color:var(--txt)}
.row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
input,select,button{font:inherit;font-size:12px;padding:7px 10px;border:1px solid var(--br);background:#0E1013;color:var(--txt);border-radius:0}
input{width:92px}input[type=range]{width:130px;padding:0}
button{cursor:pointer}button:hover{border-color:var(--amb)}
.pri{background:var(--amb);color:#14161A;border:none;font-weight:700}
.tg{font-weight:700;letter-spacing:1px}
.tg.on{background:rgba(74,222,106,.15);border-color:var(--ok);color:var(--ok)}
.tg.off{color:var(--mut)}
.hint{color:var(--mut);font-size:11px;margin-top:8px;line-height:1.5}
.ab{display:none;padding:9px;text-align:center;font-weight:700;letter-spacing:3px;margin-bottom:12px}
.ab-b{background:var(--bad);color:#fff}.ab-h{background:var(--amb);color:#14161A}.ab-m{background:var(--cy);color:#14161A}
.chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}
.chip{padding:5px 10px;border:1px solid var(--br);background:#0E1013;font-size:11px;cursor:pointer}
.chip.on{background:var(--amb);color:#14161A;border-color:var(--amb);font-weight:700}
@media(max-width:720px){.g3,.g2{grid-template-columns:1fr}.state .v{font-size:26px}}
</style></head><body>
<header><div class="dot" id="conn"></div><h1>SBOX</h1><span class="id" id="devid">-</span><span class="id" id="gL" style="margin-left:auto">-</span></header>
<div class="wrap">
<div class="strip"></div>
<div class="net"><span id="n1">-</span><span id="n2">-</span><span id="n3">-</span></div>
<div class="ab" id="ab"></div>

<div class="box state" id="stB"><div class="lbl">LIVE PREDICTION</div><div class="v" id="stV">-</div><div class="exp" id="stX">-</div></div>

<div class="g3">
<div class="box mtr"><div class="t"><span>LINK INDEX</span><span class="tag" id="mTag">-</span></div>
<div class="n" id="mV">-</div><div class="s">raw <span id="mRaw">-</span> cyc</div>
<div class="trk"><div class="fl" id="mF" style="width:0;background:var(--cy)"></div></div></div>
<div class="box mtr"><div class="t"><span>HOOK A</span><span class="tag" id="aTag">-</span></div>
<div class="n" id="aV">-</div><div class="s">raw <span id="aR">-</span> &middot; p2p <span id="aP">-</span></div>
<div class="trk"><div class="fl" id="aF" style="width:0;background:var(--amb)"></div></div></div>
<div class="box mtr"><div class="t"><span>HOOK B</span><span class="tag" id="bTag">-</span></div>
<div class="n" id="bV">-</div><div class="s">raw <span id="bR">-</span> &middot; p2p <span id="bP">-</span></div>
<div class="trk"><div class="fl" id="bF" style="width:0;background:var(--stl)"></div></div></div>
</div>

<div class="box" style="margin-bottom:12px"><h2>BUCKLE STATUS</h2><div class="bd"><div class="bkrow">
<div class="bk" id="k1"><div class="bn">BUCKLE 1</div><div class="bs" id="s1">-</div></div>
<div class="bk" id="k2"><div class="bn">BUCKLE 2</div><div class="bs" id="s2">-</div></div>
<div class="bk" id="k3"><div class="bn">BUCKLE 3</div><div class="bs" id="s3">-</div></div>
</div></div></div>

<canvas id="ch" width="880" height="160"></canvas>

<div class="g2">
<div class="box"><h2>SYSTEM</h2><div class="bd">
<div class="kv"><span>BATTERY</span><b><span id="bt">-</span>% / <span id="bv">-</span>V</b></div>
<div class="kv"><span>ALARM</span><b id="md">-</b></div>
<div class="kv"><span>FREE HEAP</span><b id="hp">-</b></div>
<div class="row" style="margin-top:10px"><button id="bBeep">TEST BEEP</button><a href="/update"><button>FIRMWARE</button></a></div>
</div></div>

<div class="box"><h2>BUZZER</h2><div class="bd">
<div class="row"><button class="tg" id="tBuz">BUZZER</button><input type="range" id="vol" min="0" max="100"><b id="volV">-</b>%</div>
<div class="kv" style="margin-top:8px"><span>BUCKLE</span><select id="pB"></select></div>
<div class="kv"><span>HOOK</span><select id="pH"></select></div>
<div class="kv"><span>MANUAL</span><select id="pM"></select></div>
<div class="row" style="margin-top:8px"><button class="pri" id="bPat">APPLY</button></div>
<div class="hint" id="volH">-</div>
</div></div>

<div class="box"><h2>SMOOTHING / PREDICTION</h2><div class="bd">
<div class="row"><button class="tg" id="tEma">EMA</button><input type="number" id="alpha" min="1" max="100"><span class="hint" style="margin:0">alpha%</span></div>
<div class="row" style="margin-top:8px"><button class="tg" id="tPred">PREDICT</button><button class="tg" id="tGuard">GUARD</button></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0">SPREAD GAIN</span><input type="number" id="gain" min="1" max="10"><button class="pri" id="bGain">SET</button></div>
</div></div>

<div class="box"><h2>HOOK ALARM</h2><div class="bd">
<div class="row"><button class="tg" id="tThr">ALARM</button><input type="number" id="thr" min="0" max="39999"><button class="pri" id="bThr">SET</button></div>
<div class="row" style="margin-top:8px"><button id="bCal">USE CURRENT -15%</button><button id="bBase">CAPTURE BASELINE</button></div>
<div class="hint" id="thrH">-</div>
</div></div>

<div class="box"><h2>CLASSIFIER LIMITS</h2><div class="bd">
<div class="row"><span class="hint" style="margin:0;width:52px">short&lt;</span><input type="number" id="mSh"><span class="hint" style="margin:0;width:52px">body&lt;</span><input type="number" id="mBr"><button class="pri" id="bMut">SET</button></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0;width:88px">hook delta</span><input type="number" id="hd"><button class="pri" id="bHd">SET</button></div>
<div class="hint">Measured: hook-to-hook short 302-344 cyc, body link 417-963, nothing bridging 12020.</div>
</div></div>

<div class="box"><h2>RECORD</h2><div class="bd">
<div class="row"><input type="text" id="lab" style="width:150px" placeholder="label"><button class="pri" id="bRec">START</button>
<button id="bClr">CLEAR</button><button id="bDl">CSV</button><span class="hint" style="margin:0 0 0 auto"><b id="cnt">0</b> rows</span></div>
<div class="chips" id="chips"></div>
</div></div>
</div>
</div>
<script>
const $=i=>document.getElementById(i);
const PRE=['Free','Body both','Hooks shorted','Grounded metal','Hook A only','Hook B only','Over clothing','Anchor point'];
const PN=['Accelerating','Double pulse','Long steady','Rapid chirp','Triple burst','Slow beep','SOS','Urgent burst'];
let A=[],B=[],M=[],MAX=180,rec=false,rows=[],busy=false,init=false,D={};
const cv=$('ch'),cx=cv.getContext('2d');
PN.forEach((n,i)=>['pB','pH','pM'].forEach(s=>{const o=document.createElement('option');o.value=i;o.textContent=n;$(s).appendChild(o)}));
PRE.forEach(p=>{const c=document.createElement('div');c.className='chip';c.textContent=p;c.onclick=()=>{$('lab').value=p;document.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));c.classList.add('on')};$('chips').appendChild(c)});
function pad(n){return String(n).padStart(2,'0')}
function ts(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds())+'.'+String(d.getMilliseconds()).padStart(3,'0')}
function tg(e,o){e.className='tg '+(o?'on':'off')}
function draw(){const w=cv.width,h=cv.height;cx.clearRect(0,0,w,h);if(A.length<2)return;
let mn=1e9,mx=-1e9;[A,B].forEach(z=>z.forEach(v=>{if(v<mn)mn=v;if(v>mx)mx=v}));
if(mn===mx){mn-=1;mx+=1}const p=(mx-mn)*.15||1;mn-=p;mx+=p;
const X=i=>i/(MAX-1)*w,Y=v=>h-(v-mn)/(mx-mn)*h;
M.forEach((v,i)=>{if(v<1000){cx.fillStyle=v<(D.msh||380)?'rgba(63,193,217,.16)':'rgba(255,165,31,.16)';cx.fillRect(X(i),0,w/MAX+1,h)}});
cx.strokeStyle='#242A33';cx.lineWidth=1;for(let g=0;g<=4;g++){const y=g/4*h;cx.beginPath();cx.moveTo(0,y);cx.lineTo(w,y);cx.stroke()}
if(D.thresh>0&&D.thresh>mn&&D.thresh<mx){cx.strokeStyle='#E8412F';cx.setLineDash([4,4]);cx.beginPath();cx.moveTo(0,Y(D.thresh));cx.lineTo(w,Y(D.thresh));cx.stroke();cx.setLineDash([])}
const pl=(z,c)=>{cx.beginPath();cx.strokeStyle=c;cx.lineWidth=2;z.forEach((v,i)=>{const x=X(i),y=Y(v);i?cx.lineTo(x,y):cx.moveTo(x,y)});cx.stroke()};
pl(A,'#FFA51F');pl(B,'#5C6B7A');
cx.fillStyle='#8A949F';cx.font='10px monospace';cx.fillText(Math.round(mx),5,12);cx.fillText(Math.round(mn),5,h-5)}
async function tick(){if(busy)return;busy=true;
try{const d=await(await fetch('/data',{cache:'no-store'})).json();D=d;$('conn').classList.add('on');
$('devid').textContent=d.id;$('gL').textContent='GUARD '+d.guard;
$('n1').textContent=d.sta_up?'LAN '+d.sta_ip+' '+d.rssi+'dBm':'LAN OFFLINE';
$('n2').textContent='AP '+d.ap_ip;$('n3').textContent=d.host;
const st=d.state,cl={'FREE':'free','BODY LINK':'human','SHORTED':'short','CONTACT':'contact'}[st]||'free';
$('stB').className='box state '+cl+(d.predict?'':' off');
$('stV').textContent=d.predict?st:'PREDICTION OFF';
$('stX').textContent=!d.predict?'enable prediction to classify':
 st==='SHORTED'?'hooks joined by a hard conductor: clipped together or on one steel member':
 st==='BODY LINK'?'a body is bridging both hooks, weaker coupling with high mains jitter':
 st==='CONTACT'?('something on '+(d.hkA?'hook A':'')+(d.hkA&&d.hkB?' and ':'')+(d.hkB?'hook B':'')+', not bridging both'):
 'both hooks clear, no coupling path';
$('mV').textContent=d.link;$('mRaw').textContent=d.mutual;
$('mTag').textContent=d.mutual<d.msh?'SHORT':d.mutual<d.mbr?'BODY':'OPEN';
$('mTag').className='tag '+(d.mutual<d.msh?'t-cy':d.mutual<d.mbr?'t-amb':'t-mut');
$('mF').style.width=Math.min(100,d.link/3400*100)+'%';
$('aV').textContent=(d.loadA>0?'+':'')+d.loadA;$('bV').textContent=(d.loadB>0?'+':'')+d.loadB;
$('aR').textContent=d.raw1;$('bR').textContent=d.raw2;$('aP').textContent=d.a_p2p;$('bP').textContent=d.b_p2p;
$('aTag').textContent=d.hkAn;$('bTag').textContent=d.hkBn;
$('aTag').className='tag '+(d.hkA==2?'t-cy':d.hkA==1?'t-amb':'t-ok');
$('bTag').className='tag '+(d.hkB==2?'t-cy':d.hkB==1?'t-amb':'t-ok');
$('aF').style.width=Math.min(100,Math.abs(d.loadA)/1600*100)+'%';
$('bF').style.width=Math.min(100,Math.abs(d.loadB)/1600*100)+'%';
[[1,d.b1],[2,d.b2],[3,d.b3]].forEach(([i,v])=>{$('k'+i).className='bk '+(v?'lk':'op');$('s'+i).textContent=v?'LOCKED':'OPEN'});
$('bt').textContent=d.batt_pct;$('bv').textContent=d.batt_v;$('md').textContent=d.mode;$('hp').textContent=d.heap;
const ab=$('ab');if(d.mode!=='NONE'){ab.style.display='block';ab.textContent='ALARM '+d.mode;ab.className='ab ab-'+d.mode[0].toLowerCase()}else ab.style.display='none';
tg($('tEma'),d.ema);tg($('tPred'),d.predict);tg($('tGuard'),d.guard==='FLOAT');tg($('tThr'),d.thresh>0);tg($('tBuz'),d.buzz);
$('tGuard').textContent='GUARD '+d.guard;$('tThr').textContent=d.thresh>0?'ALARM ON':'ALARM OFF';$('tBuz').textContent=d.buzz?'BUZZER ON':'BUZZER OFF';
$('volV').textContent=d.vol;
$('volH').textContent=d.passive?'PWM drive: volume and pitch both active.':'Active buzzer has its own oscillator, so volume control is limited. Full range arrives with the bare piezo.';
$('thrH').textContent=d.thresh>0?('Fires when BOTH hooks exceed '+d.thresh+'. Now A='+d.raw1+' B='+d.raw2+(d.hookviol?' — VIOLATION':' — clear')):'Disabled. Set above 0 to arm.';
if(!init){$('alpha').value=d.alpha;$('thr').value=d.thresh;$('mSh').value=d.msh;$('mBr').value=d.mbr;$('pB').value=d.pb;$('pH').value=d.ph;$('pM').value=d.pm;$('vol').value=d.vol;$('gain').value=d.gain;$('hd').value=d.hd;init=true}
A.push(d.raw1);B.push(d.raw2);M.push(d.mutual);if(A.length>MAX){A.shift();B.shift();M.shift()}draw();
if(rec){rows.push({t:new Date(),l:$('lab').value||'unlabeled',a:d.raw1,b:d.raw2,ap:d.a_p2p,bp:d.b_p2p,m:d.mutual,k:d.link,la:d.loadA,lb:d.loadB,ha:d.hkAn,hb:d.hkBn,s:d.state,b1:d.b1,b2:d.b2,b3:d.b3});$('cnt').textContent=rows.length}
}catch(e){$('conn').classList.remove('on')}finally{busy=false}}
const go=q=>fetch('/config?'+q);
$('tEma').onclick=()=>go('ema='+(D.ema?0:1));
$('tPred').onclick=()=>go('predict='+(D.predict?0:1));
$('tGuard').onclick=()=>go('guard='+(D.guard==='FLOAT'?0:1));
$('tBuz').onclick=()=>go('buzz='+(D.buzz?0:1));
$('tThr').onclick=()=>go('thresh='+(D.thresh>0?0:Math.round(Math.min(D.raw1,D.raw2)*.85)));
$('vol').oninput=()=>$('volV').textContent=$('vol').value;
$('vol').onchange=()=>go('vol='+$('vol').value);
$('bThr').onclick=()=>go('thresh='+(parseInt($('thr').value)||0));
$('bCal').onclick=()=>{const v=Math.round(Math.min(D.raw1,D.raw2)*.85);$('thr').value=v;go('thresh='+v)};
$('bBase').onclick=()=>go('baseA='+D.raw1+'&baseB='+D.raw2);
$('alpha').onchange=()=>go('alpha='+(parseInt($('alpha').value)||20));
$('bGain').onclick=()=>go('gain='+(parseInt($('gain').value)||1));
$('bMut').onclick=()=>go('msh='+(parseInt($('mSh').value)||380)+'&mbr='+(parseInt($('mBr').value)||1000));
$('bHd').onclick=()=>go('hd='+(parseInt($('hd').value)||250));
$('bPat').onclick=()=>go('pb='+$('pB').value+'&ph='+$('pH').value+'&pm='+$('pM').value);
$('bBeep').onclick=()=>fetch('/trigger');
$('bRec').onclick=()=>{rec=!rec;$('bRec').textContent=rec?'STOP':'START';$('bRec').className=rec?'':'pri'};
$('bClr').onclick=()=>{rows=[];$('cnt').textContent=0};
$('bDl').onclick=()=>{if(!rows.length)return alert('Nothing recorded');
const h=['Sl.No','Timestamp','Label','HookA_med','HookB_med','A_p2p','B_p2p','Mutual','LinkIdx','LoadA','LoadB','HookA_st','HookB_st','State','Buckle1','Buckle2','Buckle3'];
const L=[h.join(',')];rows.forEach((r,i)=>L.push([i+1,ts(r.t),r.l,r.a,r.b,r.ap,r.bp,r.m,r.k,r.la,r.lb,r.ha,r.hb,r.s,r.b1?'LOCKED':'OPEN',r.b2?'LOCKED':'OPEN',r.b3?'LOCKED':'OPEN'].join(',')));
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([L.join('\n')],{type:'text/csv'}));a.download='harness_'+Date.now()+'.csv';a.click()};
setInterval(tick,200);tick();
</script></body></html>
)rawliteral";

void pump(){
#if ENABLE_ARDUINO_OTA
  ArduinoOTA.handle();
#endif
  MDNS.update(); server.handleClient(); yield();
}
bool ok(){ if(!server.authenticate(ADMIN_USER,ADMIN_PASS)){ server.requestAuthentication(); return false; } return true; }

void setupEndpoints(){
  server.on("/", [](){ if(!ok())return; server.send_P(200,"text/html",INDEX_HTML); });

  server.on("/config", [](){
    if(!ok())return;
    bool ch=false;
    if(server.hasArg("thresh")){ hookThreshold=constrain(server.arg("thresh").toInt(),0,39999); ch=true; }
    if(server.hasArg("guard")){ guardFloat=server.arg("guard").toInt()!=0; ch=true; }
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
    if(server.hasArg("buzz")){ buzzEnabled=server.arg("buzz").toInt()!=0; if(!buzzEnabled) buzzOff(); ch=true; }
    if(server.hasArg("vol")){ buzzVol=constrain(server.arg("vol").toInt(),0,100); ch=true; }
    if(server.hasArg("gain")){ gain=constrain(server.arg("gain").toInt(),1,10); ch=true; }
    if(server.hasArg("hd")){ hookDelta=constrain(server.arg("hd").toInt(),20,3000); ch=true; }
    if(ch) saveConfig();
    server.send(200,"text/plain","ok");
  });

  server.on("/trigger", [](){
    if(!ok())return;
    if(!alarmActive){ alarmActive=true; alarmStartTime=millis(); }
    server.send(200,"text/plain","ACK");
  });

  server.on("/data", [](){
    bool up=(WiFi.status()==WL_CONNECTED);
    char sip[20]; if(up) strncpy(sip,WiFi.localIP().toString().c_str(),sizeof(sip)); else strcpy(sip,"-");
    sip[sizeof(sip)-1]=0;
    char aip[20]; strncpy(aip,WiFi.softAPIP().toString().c_str(),sizeof(aip)); aip[sizeof(aip)-1]=0;
    static char buf[1100];
    snprintf(buf,sizeof(buf),
      "{\"id\":\"%s\",\"guard\":\"%s\",\"raw1\":%u,\"raw2\":%u,\"a_p2p\":%u,\"b_p2p\":%u,"
      "\"loadA\":%d,\"loadB\":%d,\"link\":%d,\"hkA\":%u,\"hkB\":%u,\"hkAn\":\"%s\",\"hkBn\":\"%s\","
      "\"batt_pct\":%d,\"batt_v\":%.2f,\"b1\":%s,\"b2\":%s,\"b3\":%s,"
      "\"thresh\":%d,\"hookviol\":%s,\"mutual\":%u,\"state\":\"%s\","
      "\"ema\":%s,\"alpha\":%u,\"predict\":%s,\"msh\":%u,\"mbr\":%u,\"hd\":%u,\"gain\":%u,"
      "\"baseA\":%u,\"baseB\":%u,\"pb\":%u,\"ph\":%u,\"pm\":%u,"
      "\"buzz\":%s,\"vol\":%u,\"passive\":%s,"
      "\"alarm\":%s,\"mode\":\"%s\",\"sta_up\":%s,\"sta_ip\":\"%s\",\"ap_ip\":\"%s\","
      "\"rssi\":%d,\"heap\":%u,\"host\":\"%s.local\"}",
      sboxID, guardFloat?"FLOAT":"LOW",
      (unsigned)dispA,(unsigned)dispB,(unsigned)hookA.p2p,(unsigned)hookB.p2p,
      (int)loadA,(int)loadB,(int)linkIdx,(unsigned)hkA,(unsigned)hkB,hkName(hkA),hkName(hkB),
      battPercent,battVoltage,
      (!buckleState[0])?"true":"false",(!buckleState[1])?"true":"false",(!buckleState[2])?"true":"false",
      hookThreshold, hookViolation?"true":"false",(unsigned)mutualAB, stName(stableState),
      emaOn?"true":"false",(unsigned)emaAlphaPct,predictOn?"true":"false",
      (unsigned)mutShortMax,(unsigned)mutBridgeMax,(unsigned)hookDelta,(unsigned)gain,
      (unsigned)baseA,(unsigned)baseB,(unsigned)patBuckle,(unsigned)patHook,(unsigned)patManual,
      buzzEnabled?"true":"false",(unsigned)buzzVol, PASSIVE_PIEZO?"true":"false",
      alarmActive?"true":"false", modeName(curMode), up?"true":"false", sip, aip,
      up?WiFi.RSSI():0, (unsigned)ESP.getFreeHeap(), MDNS_NAME);
    server.send(200,"application/json",buf);
  });
}

void setup(){
  Serial.begin(115200);
  pinMode(BUCKLE1_PIN,INPUT_PULLUP); pinMode(BUCKLE2_PIN,INPUT_PULLUP); pinMode(BUCKLE3_PIN,INPUT);
  pinMode(LED_PIN,OUTPUT); pinMode(BUZZER_PIN,OUTPUT);
  digitalWrite(LED_PIN,LOW); digitalWrite(BUZZER_PIN,LOW);
  loadConfig();
  WiFi.persistent(false);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(AP_SSID,AP_PASS);
  WiFi.setAutoReconnect(true);
  WiFi.begin(STA_SSID,STA_PASS);
  Serial.println("\n[SBOX] "+String(sboxID));
  Serial.println("[SBOX] AP \""+String(AP_SSID)+"\" -> http://"+WiFi.softAPIP().toString()+"/");
  unsigned long t0=millis();
  while(WiFi.status()!=WL_CONNECTED && millis()-t0<15000){ delay(300); Serial.print("."); }
  if(WiFi.status()==WL_CONNECTED) Serial.println("\n[SBOX] LAN http://"+WiFi.localIP().toString()+"/");
  else Serial.println("\n[SBOX] LAN down, use AP.");
  httpUpdater.setup(&server,"/update",ADMIN_USER,ADMIN_PASS);
  setupEndpoints();
  server.begin();
#if ENABLE_ARDUINO_OTA
  ArduinoOTA.setHostname(MDNS_NAME);
  ArduinoOTA.setPassword(ADMIN_PASS);
  ArduinoOTA.onStart([](){ otaBusy=true; buzzOff(); digitalWrite(LED_PIN,HIGH); });
  ArduinoOTA.onEnd([](){ otaBusy=false; });
  ArduinoOTA.onError([](ota_error_t e){ (void)e; otaBusy=false; });
  ArduinoOTA.begin();
  MDNS.addService("http","tcp",80);
#else
  if(MDNS.begin(MDNS_NAME)) MDNS.addService("http","tcp",80);
#endif
}

void loop(){
#if ENABLE_ARDUINO_OTA
  if(otaBusy){ ArduinoOTA.handle(); yield(); return; }
#endif
  pump();
  unsigned long now=millis();

  static unsigned long lastSense=0;
  if(now-lastSense>=SENSE_PERIOD_MS){
    lastSense=now;
    hookA=capRawBurst(HOOK_A_PIN,HOOK_B_PIN); pump();
    hookB=capRawBurst(HOOK_B_PIN,HOOK_A_PIN); pump();
    mutualAB=readMutual(HOOK_A_PIN,HOOK_B_PIN); bridged=(mutualAB<MUTUAL_CEIL); pump();
    if(emaOn){
      float al=emaAlphaPct/100.0f;
      emaA=(emaA<0)?hookA.med:(al*hookA.med+(1-al)*emaA);
      emaB=(emaB<0)?hookB.med:(al*hookB.med+(1-al)*emaB);
      dispA=(uint32_t)emaA; dispB=(uint32_t)emaB;
    } else { emaA=-1; emaB=-1; dispA=hookA.med; dispB=hookB.med; }
    updateState();
    hookViolation=(hookThreshold>0)&&(dispA>(uint32_t)hookThreshold)&&(dispB>(uint32_t)hookThreshold);
    Serial.printf("A:%u B:%u M:%u LINK:%d %s | A=%s B=%s heap:%u\n",
      (unsigned)dispA,(unsigned)dispB,(unsigned)mutualAB,(int)linkIdx,stName(stableState),
      hkName(hkA),hkName(hkB),(unsigned)ESP.getFreeHeap());
  }

  if(now-lastBatteryRead>2000){ lastBatteryRead=now; updateBattery(); }
  bool anyOpen=updateBuckles();
  if(alarmActive && (now-alarmStartTime>=ALARM_DURATION)) alarmActive=false;

  AlarmMode want=anyOpen?ALARM_BUCKLE:hookViolation?ALARM_HOOK:alarmActive?ALARM_MANUAL:ALARM_NONE;
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
  digitalWrite(LED_PIN, curMode==ALARM_NONE?LOW:HIGH);

  static unsigned long lastWifi=0;
  if(now-lastWifi>10000){ lastWifi=now; if(WiFi.status()!=WL_CONNECTED) WiFi.reconnect(); }
}
