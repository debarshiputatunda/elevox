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
  EEPROM.begin(1024); // first 96 bytes retain the existing alarm settings
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
const char* hkName(uint8_t h){ return h==2?"BELOW BASE":h==1?"ABOVE BASE":"NEAR BASE"; }

HookState classify(){
  if(!mutualValid || !hookA.valid || !hookB.valid) return ST_FREE;
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
  if(!mutualValid || !hookA.valid || !hookB.valid){
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

const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>V6.1 HIGH guard — SBOX</title>
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
.ab-b{background:var(--bad);color:#fff}.ab-h{background:var(--amb);color:#14161A}.ab-s{background:#E8412F;color:white}.ab-m{background:var(--cy);color:#14161A}
.chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}
.chip{padding:5px 10px;border:1px solid var(--br);background:#0E1013;font-size:11px;cursor:pointer}
.chip.on{background:var(--amb);color:#14161A;border-color:var(--amb);font-weight:700}
@media(max-width:720px){.g3,.g2{grid-template-columns:1fr}.state .v{font-size:26px}}
a{color:var(--amb)}[hidden]{display:none!important}input[type=number]{font-variant-numeric:tabular-nums}#predictionDetails{margin-top:8px}
</style></head><body>
<header><div class="dot" id="conn"></div><h1>SBOX</h1><span class="id">V6.1 HIGH-GUARD</span><span class="id" id="devid">-</span><span class="id" id="gL" style="margin-left:auto">-</span></header>
<div class="wrap">
<div class="strip"></div>
<div class="net"><span id="n1">-</span><span id="n2">-</span><span id="n3">-</span></div>
<div class="ab" id="ab"></div>
<div class="box" style="margin:12px 0"><h2>ROUTER WI-FI</h2><div class="bd">
<p id="wifiAddresses">Hotspot: http://192.168.4.1 — no hotspot password required.</p>
<div class="row"><select id="wifiProfiles" aria-label="Saved router networks"><option value="">New network</option></select>
<button id="wifiConnect">CONNECT</button><button id="wifiDefault">SET DEFAULT</button><button id="wifiDelete">DELETE</button></div>
<form id="wifiForm" style="margin-top:10px">
<label for="wifiSsid">Router SSID</label><input id="wifiSsid" name="ssid" maxlength="32" autocomplete="off" style="width:180px" required>
<label for="wifiPassword">Router password</label><input id="wifiPassword" name="password" type="text" maxlength="64" autocomplete="off" style="width:180px" placeholder="Blank for open Wi-Fi">
<label><input id="wifiMakeDefault" type="checkbox" style="width:auto"> Default</label>
<button class="pri" id="wifiSave" type="submit">SAVE &amp; CONNECT</button>
<button id="wifiForget" type="button">DISCONNECT ROUTER</button>
</form>
<p class="hint">Up to five networks. Saved passwords remain visible here. Default is tried first after startup; automatic retries pause while a hotspot client is connected. Open this page manually at http://192.168.4.1/.</p>
<p class="hint" id="otaInfo"></p>
<p id="wifiStatus" role="status" aria-live="polite">Loading connection status…</p>
</div></div>


<div class="box state" id="stB"><div class="lbl">LIVE PREDICTION <span id="predictionStatus"></span></div><div id="predictionDetails"><div class="v" id="stV">-</div><div class="exp" id="stX">-</div><p class="hint" id="senseInfo"></p></div></div>

<div class="g3">
<div class="box mtr" id="linkBox"><div class="t"><span>LINK INDEX</span><span class="tag" id="mTag">-</span></div>
<div class="n" id="mV">-</div><div class="s">raw <span id="mRaw">-</span> cyc</div>
<div class="trk"><div class="fl" id="mF" style="width:0;background:var(--cy)"></div></div></div>
<div class="box mtr"><div class="t"><span>HOOK A</span><span class="tag" id="aTag">-</span></div>
<div class="n" id="aV">-</div><div class="s">load <span id="aR">-</span> &middot; p2p <span id="aP">-</span></div>
<div class="trk"><div class="fl" id="aF" style="width:0;background:var(--amb)"></div></div></div>
<div class="box mtr"><div class="t"><span>HOOK B</span><span class="tag" id="bTag">-</span></div>
<div class="n" id="bV">-</div><div class="s">load <span id="bR">-</span> &middot; p2p <span id="bP">-</span></div>
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
<div class="row" style="margin-top:10px"><button id="bBeep">TEST BEEP</button><a href='/connect'>Connection addresses</a> <a href='/update'>Firmware update</a></div>
</div></div>

<div class="box"><h2>BUZZER</h2><div class="bd">
<div class="row"><button class="tg" id="tBuz">BUZZER</button><input type="range" id="vol" min="0" max="100"><b id="volV">-</b>%</div>
<div class="kv" style="margin-top:8px"><span>BUCKLE</span><select id="pB"></select></div>
<div class="kv"><span>HOOK</span><select id="pH"></select></div>
<div class="kv"><span>MANUAL</span><select id="pM"></select></div>
<div class="row" style="margin-top:8px"><button class="pri" id="bPat">APPLY</button></div>
<div class="hint" id="volH">-</div>
</div></div>

<div class="box"><h2>SMOOTHING / PREDICTION</h2><div class="bd"><p id="controlStatus" role="status"></p>
<div class="row"><button class="tg" id="tEma">EMA</button><input type="number" id="alpha" min="1" max="100"><span class="hint" style="margin:0">alpha%</span></div>
<div class="row" style="margin-top:8px"><button class="tg" id="tPred">PREDICT</button><button class="tg" id="tGuard" disabled>GUARD HIGH</button></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0">SPREAD GAIN</span><input type="number" id="gain" min="1" max="10"><button class="pri" id="bGain">SET</button></div>
<div class="hint">V6: mean of 16 discharge samples with the other hook driven HIGH. No hook is driven LOW. Coupling resets passively. These readings do not confirm mechanical fastening.</div>
</div></div>

<div class="box"><h2>HOOK ALARM THRESHOLDS</h2><div class="bd">
<form id="thresholdForm" class="row"><label for="limitA">Hook A</label><input id="limitA" type="number" min="0" max="100000" step="1" required style="width:100px">
<label for="limitB">Hook B</label><input id="limitB" type="number" min="0" max="100000" step="1" required style="width:100px">
<button class="pri" id="limitSave">SAVE</button><button id="limitRefresh" type="button">REFRESH</button></form>
<div id="thrH" class="hint">Waiting for telemetry</div><p id="limitStatus" role="status"></p>
<p class="hint">Saved on device immediately. Syncs to the website when connected. Competing website edits take priority. Zero is a literal threshold.</p></div></div>

<div class="box" id="classifierBox"><h2>CLASSIFIER LIMITS</h2><div class="bd">
<div class="row"><span class="hint" style="margin:0;width:52px">strong&lt;</span><input type="number" id="mSh"><span class="hint" style="margin:0;width:52px">weak&lt;</span><input type="number" id="mBr"><button class="pri" id="bMut">SET</button></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0;width:88px">hook delta</span><input type="number" id="hd"><button class="pri" id="bHd">SET</button></div>
<div class="hint">V6 limits require new measurements. Link strength alone does not identify the contact material or prove fastening.</div>
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
async function deviceFetch(url,options={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
 try{const response=await fetch(url,{...options,signal:controller.signal});const body=await response.text();return {ok:response.ok,status:response.status,json:async()=>JSON.parse(body),text:async()=>body}}finally{clearTimeout(timer)}
}
let settingsEpoch=0;
let limitDirty=false,limitSaving=false,limitRevision=0,limitSavedTarget=null;
function showLimits(d){
 if(!limitDirty && !limitSaving){$('limitA').value=d.threshold_a;$('limitB').value=d.threshold_b;limitRevision=d.threshold_edit_revision}
 $('thrH').textContent='Device: A '+d.threshold_a+' / B '+d.threshold_b+(d.hook_alarm_enabled?'':' (not armed)');
 if(limitSavedTarget && !d.threshold_edit_pending){
  $('limitStatus').textContent=d.threshold_a===limitSavedTarget[0]&&d.threshold_b===limitSavedTarget[1]?'Device and website synchronized.':'Website conflict resolved: using website values.';limitSavedTarget=null;
 }
}
for(const id of ['limitA','limitB'])$(id).addEventListener('input',()=>{if(!limitDirty && D)limitRevision=D.threshold_edit_revision;limitDirty=true});
$('limitRefresh').onclick=()=>{limitDirty=false;limitSavedTarget=null;if(D)showLimits(D);$('limitStatus').textContent='Current device values loaded.'};
$('thresholdForm').onsubmit=async e=>{
 e.preventDefault();if(limitSaving||!D)return;
 limitSaving=true;settingsEpoch++;$('limitSave').disabled=true;
 const a=Number($('limitA').value),b=Number($('limitB').value);
 try{
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>100000||b>100000)throw Error('Use integers from 0 to 100000');
  const response=await deviceFetch('/thresholds',{method:'POST',body:new URLSearchParams({threshold_a:a,threshold_b:b,source:'device',expected_revision:limitRevision})});
  if(!response.ok)throw Error(await response.text());
  limitDirty=false;limitSavedTarget=[a,b];$('limitStatus').textContent='Saved on device; awaiting website sync.';
 }catch(e){$('limitStatus').textContent='Not saved: '+e.message}
 finally{settingsEpoch++;limitSaving=false;$('limitSave').disabled=false}
};
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
if(D.predict)M.forEach((v,i)=>{if(v<1000){cx.fillStyle=v<(D.msh||380)?'rgba(63,193,217,.16)':'rgba(255,165,31,.16)';cx.fillRect(X(i),0,w/MAX+1,h)}});
cx.strokeStyle='#242A33';cx.lineWidth=1;for(let g=0;g<=4;g++){const y=g/4*h;cx.beginPath();cx.moveTo(0,y);cx.lineTo(w,y);cx.stroke()}
const pl=(z,c)=>{cx.beginPath();cx.strokeStyle=c;cx.lineWidth=2;z.forEach((v,i)=>{const x=X(i),y=Y(v);i?cx.lineTo(x,y):cx.moveTo(x,y)});cx.stroke()};
pl(A,'#FFA51F');pl(B,'#5C6B7A');
cx.fillStyle='#8A949F';cx.font='10px monospace';cx.fillText(Math.round(mx),5,12);cx.fillText(Math.round(mn),5,h-5)}
async function tick(){if(busy||document.hidden)return;busy=true;const epoch=settingsEpoch;
try{const d=await(await deviceFetch('/data',{cache:'no-store'})).json();if(epoch!==settingsEpoch)return;D=d;$('conn').classList.add('on');
$('devid').textContent=d.id;$('gL').textContent='GUARD '+d.guard;
$('n1').textContent=d.sta_up?'LAN '+d.sta_ip+' '+d.rssi+'dBm':'LAN OFFLINE';
$('n2').textContent='AP '+d.ap_ip;$('n3').textContent=d.host;
const measurementValid=d.mutual_valid && d.hook_a_valid && d.hook_b_valid;
const st=measurementValid?d.state:'UNKNOWN',cl={'FREE':'free','WEAK LINK':'human','STRONG LINK':'short','CONTACT':'contact'}[st]||'free';
$('stB').className='box state '+cl+(d.predict?'':' off');
$('predictionStatus').textContent=d.predict?'ON':'OFF';
$('predictionDetails').hidden=!d.predict;$('classifierBox').hidden=!d.predict;$('linkBox').hidden=!d.predict;
$('stV').textContent=st;
$('stX').textContent=!d.predict?'enable prediction to classify':
 !measurementValid?'Measurement incomplete: passive reset failed or hook stayed HIGH. No fastening conclusion.':
 st==='STRONG LINK'?'Strong electrical link: touching hooks and hooks on shared metal may look identical.':
 st==='WEAK LINK'?'Weaker electrical coupling; material and fastening are unverified.':
 'Electrical loading only; mechanical fastening is unverified.';
$('mV').textContent=d.mutual_valid?d.link:'—';$('mRaw').textContent=d.mutual_valid?d.mutual:'unknown';
$('mTag').textContent=!d.mutual_valid?'UNKNOWN':d.mutual<d.msh?'STRONG':d.mutual<d.mbr?'WEAK':'NO RISE';
$('mTag').className='tag t-mut';
$('mF').style.width=(d.mutual_valid?Math.min(100,d.link/3400*100):0)+'%';
$('senseInfo').textContent='Timed-out samples: A '+d.a_timeouts+'/16, B '+d.b_timeouts+'/16. Coupling valid: '+d.mutual_valid;
$('aV').textContent=d.raw1;$('bV').textContent=d.raw2;
$('aR').textContent=d.predict?(d.loadA>0?'+':'')+d.loadA:'—';$('bR').textContent=d.predict?(d.loadB>0?'+':'')+d.loadB:'—';
$('aP').textContent=d.a_p2p;$('bP').textContent=d.b_p2p;
$('aTag').textContent=d.predict?(d.hook_a_valid?d.hkAn:'UNKNOWN'):'OFF';$('bTag').textContent=d.predict?(d.hook_b_valid?d.hkBn:'UNKNOWN'):'OFF';
$('aTag').className='tag '+(d.hkA==2?'t-cy':d.hkA==1?'t-amb':'t-ok');
$('bTag').className='tag '+(d.hkB==2?'t-cy':d.hkB==1?'t-amb':'t-ok');
$('aF').style.width=Math.min(100,d.raw1/16000*100)+'%';
$('bF').style.width=Math.min(100,d.raw2/16000*100)+'%';
[[1,d.b1],[2,d.b2],[3,d.b3]].forEach(([i,v])=>{$('k'+i).className='bk '+(v?'lk':'op');$('s'+i).textContent=v?'LOCKED':'OPEN'});
$('bt').textContent=d.batt_pct;$('bv').textContent=d.batt_v;$('md').textContent=d.mode;$('hp').textContent=d.heap;
const ab=$('ab');if(d.mode!=='NONE'){ab.style.display='block';ab.textContent='ALARM '+d.mode;ab.className='ab ab-'+d.mode[0].toLowerCase()}else ab.style.display='none';
tg($('tEma'),d.ema);tg($('tPred'),d.predict);tg($('tGuard'),d.guard==='HIGH');tg($('tBuz'),d.buzz);
$('tGuard').textContent='GUARD '+d.guard;$('tBuz').textContent=d.buzz?'BUZZER ON':'BUZZER OFF';
$('volV').textContent=d.vol;
$('volH').textContent=d.passive?'PWM drive: volume and pitch both active.':'Active buzzer has its own oscillator, so volume control is limited. Full range arrives with the bare piezo.';
showLimits(d);
if(!init){$('alpha').value=d.alpha;$('mSh').value=d.msh;$('mBr').value=d.mbr;$('pB').value=d.pb;$('pH').value=d.ph;$('pM').value=d.pm;$('vol').value=d.vol;$('gain').value=d.gain;$('hd').value=d.hd;init=true}
A.push(d.raw1);B.push(d.raw2);M.push(d.mutual);if(A.length>MAX){A.shift();B.shift();M.shift()}draw();
if(rec && rows.length<10000){rows.push({t:new Date(),l:$('lab').value||'unlabeled',a:d.raw1,b:d.raw2,ap:d.a_p2p,bp:d.b_p2p,m:d.mutual,k:d.link,la:d.loadA,lb:d.loadB,ha:d.hkAn,hb:d.hkBn,s:d.state,b1:d.b1,b2:d.b2,b3:d.b3,av:d.hook_a_valid,bvalid:d.hook_b_valid,mv:d.mutual_valid,at:d.a_timeouts,bt:d.b_timeouts});$('cnt').textContent=rows.length}
}catch(e){$('conn').classList.remove('on')}finally{busy=false}}
const go=async q=>{settingsEpoch++;try{const r=await deviceFetch('/config?'+q);if(!r.ok)throw Error(await r.text());$('controlStatus').textContent='';}catch(e){$('controlStatus').textContent='Setting not saved: '+e.message}finally{settingsEpoch++}};
$('tEma').onclick=()=>go('ema='+(D.ema?0:1));
$('tPred').onclick=()=>go('predict='+(D.predict?0:1));
// HIGH guard is fixed in v6.
$('tBuz').onclick=()=>go('buzz='+(D.buzz?0:1));
$('vol').oninput=()=>$('volV').textContent=$('vol').value;
$('vol').onchange=()=>go('vol='+$('vol').value);
$('alpha').onchange=()=>go('alpha='+(parseInt($('alpha').value)||20));
$('bGain').onclick=()=>go('gain='+(parseInt($('gain').value)||1));
$('bMut').onclick=()=>go('msh='+(parseInt($('mSh').value)||380)+'&mbr='+(parseInt($('mBr').value)||1000));
$('bHd').onclick=()=>go('hd='+(parseInt($('hd').value)||250));
$('bPat').onclick=()=>go('pb='+$('pB').value+'&ph='+$('pH').value+'&pm='+$('pM').value);
$('bBeep').onclick=()=>deviceFetch('/trigger');
$('bRec').onclick=()=>{rec=!rec;$('bRec').textContent=rec?'STOP':'START';$('bRec').className=rec?'':'pri'};
$('bClr').onclick=()=>{rows=[];$('cnt').textContent=0};
$('bDl').onclick=()=>{if(!rows.length)return alert('Nothing recorded');
const h=['Sl.No','Timestamp','Label','HookA_mean','HookB_mean','A_p2p','B_p2p','Mutual','LinkIdx','LoadA','LoadB','HookA_st','HookB_st','State','Buckle1','Buckle2','Buckle3','HookA_valid','HookB_valid','Mutual_valid','A_timeouts','B_timeouts'];
const L=[h.join(',')];rows.forEach((r,i)=>L.push([i+1,ts(r.t),r.l,r.a,r.b,r.ap,r.bp,r.m,r.k,r.la,r.lb,r.ha,r.hb,r.s,r.b1?'LOCKED':'OPEN',r.b2?'LOCKED':'OPEN',r.b3?'LOCKED':'OPEN',r.av,r.bvalid,r.mv,r.at,r.bt].join(',')));
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([L.join('\n')],{type:'text/csv'}));a.download='harness_'+Date.now()+'.csv';a.click()};
let wifiEpoch=0,wifiInitialized=false,wifiSaving=false,wifiPolling=false,wifiDirty=false,wifiSaveError='',profiles=[],wifiSignature='';
const wifiText={connected:'Connected to router',connecting:'Connecting (up to 30 seconds)…',paused:'Automatic retry paused while hotspot is in use. Select CONNECT to retry now.',
 'connection-failed':'Router unavailable; retries use 1–5 minute backoff. The hotspot remains available.',
 'hotspot-only':'Router disconnected; saved profiles are retained.'};
function selectProfile(){
 const raw=$('wifiProfiles').value,n=raw===''?null:profiles[Number(raw)];
 $('wifiSsid').value=n?n.ssid:'';$('wifiPassword').value=n?n.password:'';wifiDirty=false;
}
$('wifiProfiles').onchange=selectProfile;
$('wifiSsid').oninput=$('wifiPassword').oninput=()=>{wifiDirty=true};
async function pollWifi(){
 if(wifiPolling||wifiSaving||document.hidden)return;wifiPolling=true;const epoch=wifiEpoch;
 try{
  const response=await deviceFetch('/wifi',{cache:'no-store'});if(!response.ok)throw Error('Connection status unavailable');
  const state=await response.json();if(epoch!==wifiEpoch)return;profiles=state.profiles;
  const signature=JSON.stringify([profiles,state.default]);
  if(signature!==wifiSignature){
   const selected=$('wifiProfiles').value;const select=$('wifiProfiles');select.replaceChildren(new Option('New network',''));
   profiles.forEach((n,i)=>select.add(new Option(n.ssid+(i===state.default?' [DEFAULT]':''),String(i))));
   select.value=!wifiInitialized?String(state.active>=0?state.active:state.default):selected;
   if(!wifiDirty)selectProfile();wifiSignature=signature;
  }
  wifiInitialized=true;
  $('wifiAddresses').textContent='Open hotspot: '+state.ap_ssid+' — http://'+state.ap_ip+(state.sta_ip?' | Router: http://'+state.sta_ip:' | Router offline');
  $('otaInfo').textContent='Firmware: '+state.sketch_bytes+' bytes | OTA capacity: '+state.ota_max_bytes+' bytes | Free RAM: '+state.heap+' bytes';
  $('wifiStatus').textContent=wifiSaveError||wifiText[state.status]||'Unknown connection status';
 }catch(e){$('wifiStatus').textContent=wifiSaveError||'Connection interrupted. Rejoin SBox and open http://192.168.4.1/.'}
 finally{wifiPolling=false}
}
async function networkAction(action,extra={}){
 if(wifiSaving)return;wifiSaving=true;wifiEpoch++;wifiSaveError='';
 for(const id of ['wifiSave','wifiConnect','wifiDefault','wifiDelete','wifiForget'])$(id).disabled=true;
 try{
  const fields={action,...extra};if(['connect','default','delete'].includes(action)){
   if($('wifiProfiles').value==='')throw Error('Select a saved network first');fields.index=$('wifiProfiles').value;
  }
  const response=await deviceFetch('/wifi',{method:'POST',body:new URLSearchParams(fields)});
  if(!response.ok)throw Error(await response.text());
  wifiDirty=false;wifiInitialized=false;wifiSignature='';
  $('wifiStatus').textContent='Saved. '+(action==='disconnect'?'Router disconnected.':'The hotspot remains available.');
 }catch(e){wifiSaveError='Not saved: '+e.message;$('wifiStatus').textContent=wifiSaveError}
 finally{wifiEpoch++;wifiSaving=false;for(const id of ['wifiSave','wifiConnect','wifiDefault','wifiDelete','wifiForget'])$(id).disabled=false;}
}
$('wifiForm').onsubmit=e=>{e.preventDefault();networkAction('save',{ssid:$('wifiSsid').value,password:$('wifiPassword').value,make_default:$('wifiMakeDefault').checked?'1':'0'})};
$('wifiConnect').onclick=()=>networkAction('connect');$('wifiDefault').onclick=()=>networkAction('default');
$('wifiDelete').onclick=()=>networkAction('delete');$('wifiForget').onclick=()=>networkAction('disconnect');
setInterval(pollWifi,5000);pollWifi();
setInterval(tick,500);tick();
</script></body></html>
)rawliteral";

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

void setupEndpoints(){
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
    static char buf[1900];
    snprintf(buf,sizeof(buf),
      "{\"threshold_edit_revision\":%u,\"threshold_edit_pending\":%s,\"threshold_base_a\":%u,\"threshold_base_b\":%u,\"threshold_base_valid\":%s,"
      "\"protocol\":\"elevox-v5/1\",\"firmware\":\"v6.1-high-guard\",\"mutual_valid\":%s,\"a_timeouts\":%u,\"b_timeouts\":%u,\"id\":\"%s\",\"guard\":\"%s\",\"raw1\":%d,\"raw2\":%d,\"a_p2p\":%u,\"b_p2p\":%u,"
      "\"loadA\":%d,\"loadB\":%d,\"link\":%d,\"hkA\":%u,\"hkB\":%u,\"hkAn\":\"%s\",\"hkBn\":\"%s\","
      "\"batt_pct\":%d,\"batt_v\":%.2f,\"b1\":%s,\"b2\":%s,\"b3\":%s,"
      "\"threshold_a\":%u,\"threshold_b\":%u,\"hook_alarm_enabled\":%s,\"hook_a_valid\":%s,\"hook_b_valid\":%s,\"hookviol\":%s,\"mutual\":%u,\"state\":\"%s\","
      "\"ema\":%s,\"alpha\":%u,\"predict\":%s,\"msh\":%u,\"mbr\":%u,\"hd\":%u,\"gain\":%u,"
      "\"baseA\":%u,\"baseB\":%u,\"pb\":%u,\"ph\":%u,\"pm\":%u,"
      "\"buzz\":%s,\"vol\":%u,\"passive\":%s,"
      "\"alarm\":%s,\"mode\":\"%s\",\"sta_up\":%s,\"sta_ip\":\"%s\",\"ap_ip\":\"%s\","
      "\"rssi\":%d,\"heap\":%u,\"host\":\"%s.local\"}",
      thresholdState.revision,thresholdState.pending?"true":"false",thresholdState.baseA,thresholdState.baseB,thresholdState.baseValid?"true":"false",
      mutualValid?"true":"false",(unsigned)hookA.timeouts,(unsigned)hookB.timeouts,
      sboxID, "HIGH",
      hookA.valid?(int)dispA:-1,hookB.valid?(int)dispB:-1,(unsigned)hookA.p2p,(unsigned)hookB.p2p,
      (int)loadA,(int)loadB,(int)linkIdx,(unsigned)hkA,(unsigned)hkB,hkName(hkA),hkName(hkB),
      battPercent,battVoltage,
      (!buckleState[0])?"true":"false",(!buckleState[1])?"true":"false",(!buckleState[2])?"true":"false",
      thresholdA,thresholdB,hookAlarmEnabled?"true":"false",hookA.valid?"true":"false",hookB.valid?"true":"false", hookViolation?"true":"false",(unsigned)mutualAB, (!mutualValid||!hookA.valid||!hookB.valid)?"UNKNOWN":stName(stableState),
      emaOn?"true":"false",(unsigned)emaAlphaPct,predictOn?"true":"false",
      (unsigned)mutShortMax,(unsigned)mutBridgeMax,(unsigned)hookDelta,(unsigned)gain,
      (unsigned)baseA,(unsigned)baseB,(unsigned)patBuckle,(unsigned)patHook,(unsigned)patManual,
      buzzEnabled?"true":"false",(unsigned)buzzVol, PASSIVE_PIEZO?"true":"false",
      curMode!=ALARM_NONE?"true":"false", modeName(curMode), up?"true":"false", sip, aip,
      up?WiFi.RSSI():0, (unsigned)ESP.getFreeHeap(), MDNS_NAME);
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

void loop(){
#if ENABLE_ARDUINO_OTA
  if(otaBusy){ ArduinoOTA.handle(); yield(); return; }
#endif
  pump();
  serviceWifi();
  unsigned long now=millis();

  static unsigned long lastSense=0;
  if(now-lastSense>=SENSE_PERIOD_MS){
    lastSense=now;
    // Alternate hook measurements with the inactive hook HIGH; release between reads.
    hookA=readHook(HOOK_A_PIN,HOOK_B_PIN,pump); pump();
    hookB=readHook(HOOK_B_PIN,HOOK_A_PIN,pump); pump();
    if(predictOn)mutualAB=readMutual(HOOK_A_PIN,HOOK_B_PIN,mutualValid);
    else {mutualValid=false;mutualAB=MUTUAL_CEIL;}
    bridged=mutualValid && (mutualAB<MUTUAL_CEIL); pump();
    if(emaOn){
      emaA=smoothHook(emaA,hookA.valid?(int32_t)hookA.mean:-1,emaAlphaPct);
      emaB=smoothHook(emaB,hookB.valid?(int32_t)hookB.mean:-1,emaAlphaPct);
      dispA=hookA.valid?(uint32_t)emaA:0; dispB=hookB.valid?(uint32_t)emaB:0;
    } else { emaA=-1; emaB=-1; dispA=hookA.mean; dispB=hookB.mean; }
    if(predictOn)updateState();
    hookViolation=hooksExceeded(hookA.valid?(int32_t)dispA:-1,hookB.valid?(int32_t)dispB:-1,thresholdA,thresholdB,hookAlarmEnabled);
    Serial.printf("A:%u B:%u M:%u LINK:%d %s | A=%s B=%s heap:%u\n",
      (unsigned)dispA,(unsigned)dispB,(unsigned)mutualAB,(int)linkIdx,stName(stableState),
      hkName(hkA),hkName(hkB),(unsigned)ESP.getFreeHeap());
  }

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
