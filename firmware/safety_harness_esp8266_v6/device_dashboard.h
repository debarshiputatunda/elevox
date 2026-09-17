#pragma once
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>v6.2.0</title>
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

:root{--field:#101419;--ok:#6dd58a;--mut:#a1acb8}
body.light{--bg:#edf1f4;--pnl:#fff;--pnl2:#e8edf2;--amb:#8c5000;--stl:#586d7f;--txt:#17232e;--mut:#526474;--ok:#14743a;--bad:#bd3023;--cy:#00768d;--br:#cbd4dd;--ln:#b6c4d0;--field:#f5f8fa}
header{padding:14px 20px;border-bottom-width:2px;flex-wrap:wrap}header h1{letter-spacing:1px;font-size:16px}.dot{border-radius:50%}.wrap{max-width:1040px;padding:20px}.strip{display:none}.box{border-radius:4px;overflow:hidden}.box h2{font-size:11px;padding:10px 14px;letter-spacing:1.4px}.box .bd{padding:14px}.state{padding:14px}.state.off{opacity:1}.g2,.g3{gap:12px}.mtr{padding:15px}.mtr .n{font-size:30px}.trk,.bk,input,select,button,.chip{background:var(--field)}.t-mut{background:var(--pnl2)}.pri,.chip.on{background:var(--amb);color:var(--pnl)}
button,.button{min-height:36px;display:inline-flex;align-items:center;justify-content:center;gap:5px}.button{padding:7px 10px;border:1px solid var(--br);background:var(--field);color:var(--txt);text-decoration:none;font-size:12px}.button:hover{border-color:var(--amb)}button:disabled{opacity:.5;cursor:default}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--cy);outline-offset:2px}.hint{line-height:1.65}.stream{padding:12px 14px;margin-bottom:12px;border-left-color:var(--ok)}.stream.stale{border-left-color:var(--bad)}.stream.stale #streamStatus{color:var(--bad)}#streamStats,#chartTime{font-variant-numeric:tabular-nums}#deviceName{font-weight:700;font-size:15px}#nameInput{width:min(260px,100%)}.step{margin-top:10px;padding:10px;border:1px solid var(--br)}.step p{margin:0 0 8px}.step.done{border-left:3px solid var(--ok)}#chartTime{margin:-5px 0 14px}.net{margin-bottom:14px}.devicebar{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}.devicebar details{margin-left:auto}.devicebar form{margin-top:8px}.calhead{margin-bottom:10px}
@media(max-width:720px){.wrap{padding:12px}header{padding:12px}.devicebar details{margin-left:0;width:100%}.kv{gap:10px}.net{gap:8px}#wifiForm{display:flex;flex-direction:column;align-items:flex-start}#wifiForm input{max-width:100%}.bk .bn{font-size:8px}.bk .bs{font-size:12px}}
</style></head><body>
<header><div class="dot" id="conn" aria-label="Connection status"></div><h1>v6.2.0</h1><button id="lightToggle" class="tg" style="margin-left:auto" disabled>LIGHT MODE</button></header>
<div class="wrap">
<div class="devicebar"><span id="deviceName">Connecting…</span><span class="id" id="devid">-</span><details><summary>Edit device name</summary><form id="nameForm" class="row"><label for="nameInput">Device / hotspot name</label><input id="nameInput" maxlength="32" pattern="[A-Za-z0-9_\-](?:[A-Za-z0-9 _\-]{0,30}[A-Za-z0-9_\-])?" required autocomplete="off"><button id="nameSave" class="pri">SAVE NAME</button></form><p class="hint">1–32 letters, numbers, spaces, hyphens or underscores. No spaces at either end. Renaming also changes the hotspot name.</p></details></div><p id="deviceStatus" role="status"></p>
<div class="net"><span id="n1">-</span><span id="n2">-</span><span id="n3">-</span></div>
<div class="ab" id="ab"></div>
<div class="box stream" id="streamBox"><div class="row"><strong id="streamStatus" role="status">Waiting for stream</strong><button id="diagnostics" style="margin-left:auto">DOWNLOAD DIAGNOSTICS</button></div><div class="hint" id="streamStats">Response and sensor sample ages will appear here.</div><div class="hint" id="diagnosticStatus" role="status"></div></div>
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

<canvas id="ch" width="880" height="160" aria-label="Hook A and B recent readings"></canvas><p class="hint" id="chartTime">Waiting for sensor samples…</p>

<div class="g2">
<div class="box"><h2>SYSTEM</h2><div class="bd">
<div class="kv"><span>BATTERY</span><b><span id="bt">-</span>% / <span id="bv">-</span>V</b></div>
<div class="kv"><span>ALARM</span><b id="md">-</b></div>
<div class="kv"><span>FREE HEAP</span><b id="hp">-</b></div>
<div class="row" style="margin-top:10px"><button id="bBeep">TEST BEEP</button><a class='button' href='/update'>FIRMWARE UPDATE</a></div>
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
<div class="row" style="margin-top:8px"><button class="tg" id="tPred">PREDICT</button><span class="hint" id="gL"></span><span id="tGuard" hidden></span></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0">SPREAD GAIN</span><input type="number" id="gain" min="1" max="10"><button class="pri" id="bGain">SET</button></div>
<div class="hint">V6: mean of 16 discharge samples with the other hook driven HIGH. No hook is driven LOW. Coupling resets passively. These readings do not confirm mechanical fastening.</div>
</div></div>

<div class="box"><h2>HOOK ALARM THRESHOLDS</h2><div class="bd">
<form id="thresholdForm" class="row"><label for="limitA">Hook A</label><input id="limitA" type="number" min="0" max="100000" step="1" required style="width:100px">
<label for="limitB">Hook B</label><input id="limitB" type="number" min="0" max="100000" step="1" required style="width:100px">
<button class="pri" id="limitSave">SAVE</button><button id="limitRefresh" type="button">REFRESH</button></form>
<div id="thrH" class="hint">Waiting for telemetry</div><p id="limitStatus" role="status"></p>
<p class="hint">Saved on device immediately. Syncs to the website when connected. Competing website edits take priority. Zero is a literal threshold.</p></div></div>

<div class="box" id="calibrationBox"><h2>OPTIONAL GUIDED CALIBRATION</h2><div class="bd"><p class="hint calhead">Works immediately with defaults. For a reference, collect 5 seconds in each condition. Nothing starts until you press its READY button. Keep hooks still during collection.</p><label for="referenceMode">Reference contact</label> <select id="referenceMode"><option value="1">Hand</option><option value="2">Metal</option></select><p id="calibrationProvenance" class="hint"></p><p id="calibrationStatus" role="status" aria-live="polite"></p>
<div class="step" id="step1"><p>1 · FREE — Leave both hooks separate, untouched and away from metal.</p><button id="calReady1">READY · CAPTURE FREE (5s)</button></div>
<div class="step" id="step2"><p id="instructionA">2 · HOOK A — Touch only Hook A with your hand. Leave Hook B free.</p><button id="calReady2" disabled>READY · CAPTURE A (5s)</button></div>
<div class="step" id="step3"><p id="instructionB">3 · HOOK B — Touch only Hook B with your hand. Leave Hook A free.</p><button id="calReady3" disabled>READY · CAPTURE B (5s)</button></div>
<div class="row" style="margin-top:10px"><button id="calCancel">CANCEL CAPTURE</button><button id="calClear">USE DEFAULTS</button></div><p class="hint">References describe electrical response only; they cannot prove fastening or identify every material. Ambiguous readings remain UNKNOWN.</p></div></div>
<div class="box" id="classifierBox"><h2>CLASSIFIER LIMITS</h2><div class="bd">
<div class="row"><span class="hint" style="margin:0;width:52px">strong&lt;</span><input type="number" id="mSh"><span class="hint" style="margin:0;width:52px">weak&lt;</span><input type="number" id="mBr"><button class="pri" id="bMut">SET</button></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0;width:88px">hook delta</span><input type="number" id="hd"><button class="pri" id="bHd">SET</button></div>
<div class="hint">V6 limits require new measurements. Link strength alone does not identify the contact material or prove fastening.</div>
</div></div>

<div class="box"><h2>RECORD</h2><div class="bd">
<div class="row"><input type="text" id="lab" style="width:150px" placeholder="label"><button class="pri" id="bRec">START</button>
<button id="bClr">CLEAR</button><button id="bDl">CSV</button><span class="hint" style="margin:0 0 0 auto"><b id="cnt">0</b> rows</span></div>
<div class="chips" id="chips"></div><p class="hint" id="recordStatus">Up to 10,000 fresh samples per recording buffer. Unchanged readings are included. Recording continues while hidden, but browsers may throttle background tabs; gaps cannot be recovered.</p>
</div></div>
</div>
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
const PRE=['Free','Body both','Hooks shorted','Grounded metal','Hook A only','Hook B only','Over clothing','Anchor point','Mixed usage'];
const PN=['Accelerating','Double pulse','Long steady','Rapid chirp','Triple burst','Slow beep','SOS','Urgent burst'];
let A=[],B=[],M=[],MAX=180,rec=false,rows=[],busy=false,init=false,D={};
let lastResponse=0,lastSampleSeen=0,lastSampleKey='',responseCount=0,sampleCount=0,requestErrors=0,lastError='',sampleAge=0,lastUptime=0,deviceSaving=false,nameDirty=false,calSaving=false;
const MAX_ROWS=10000;
function downloadBlob(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function freshStatus(){const now=performance.now(),responseAge=lastResponse?now-lastResponse:Infinity,age=lastResponse?Math.max(sampleAge+responseAge,now-lastSampleSeen):Infinity;
 const stale=responseAge>3000||age>3000;$('streamBox').classList.toggle('stale',stale);$('conn').classList.toggle('on',responseAge<3000);
 $('streamStatus').textContent=!lastResponse?'Waiting for stream':responseAge>3000?'RESPONSE STALE':age>3000?'SENSOR SAMPLES STALE':'LIVE · sensor sampling';
 $('streamStats').textContent='Response age '+(Number.isFinite(responseAge)?(responseAge/1000).toFixed(1)+'s':'—')+' · Sample age '+(Number.isFinite(age)?(age/1000).toFixed(1)+'s':'—')+' · Sample #'+(D.sample_seq??'—')+' · '+responseCount+' responses / '+sampleCount+' observed samples · '+requestErrors+' request errors'+(lastError?' · '+lastError:'');
 if(D.calibration_running&&lastResponse)$('calibrationStatus').textContent='Collecting step '+D.calibration_step+' · '+Math.ceil(Math.max(0,D.calibration_remaining_ms-responseAge)/1000)+'s remaining'+(responseAge>3000?' · awaiting device status':'');
}
$('nameInput').oninput=()=>{nameDirty=true};
async function saveDevice(fields){if(deviceSaving)return;deviceSaving=true;settingsEpoch++;$('lightToggle').disabled=true;$('nameSave').disabled=true;
 try{const r=await deviceFetch('/device',{method:'POST',body:new URLSearchParams(fields)});if(!r.ok)throw Error(await r.text());const result=await r.json();if(!result.saved)throw Error('Device did not confirm save');
 document.body.classList.toggle('light',!!result.light);D.light_mode=!!result.light;$('lightToggle').textContent=result.light?'DARK MODE':'LIGHT MODE';
 if(fields.name){nameDirty=false;$('nameInput').value=result.name;$('deviceName').textContent=result.name}
 $('deviceStatus').textContent=result.reconnect?'Saved. In 2 seconds the hotspot becomes “'+result.name+'”. Rejoin that network and open http://192.168.4.1/.':'Saved on device.';
 }catch(e){$('deviceStatus').textContent='Not saved: '+e.message}finally{deviceSaving=false;settingsEpoch++;$('lightToggle').disabled=false;$('nameSave').disabled=false}}
$('nameForm').onsubmit=e=>{e.preventDefault();const name=$('nameInput').value;if(!/^[A-Za-z0-9_-](?:[A-Za-z0-9 _-]{0,30}[A-Za-z0-9_-])?$/.test(name)){$('deviceStatus').textContent='Use 1–32 permitted characters with no edge spaces.';return}saveDevice({name})};
$('lightToggle').onclick=()=>saveDevice({light:D.light_mode?'0':'1'});
$('diagnostics').onclick=async()=>{try{const r=await deviceFetch('/diagnostics',{cache:'no-store'});if(!r.ok)throw Error(await r.text());const device=await r.json();downloadBlob(new Blob([JSON.stringify({device,browser:{captured_at:new Date().toISOString(),response_count:responseCount,observed_sample_count:sampleCount,request_errors:requestErrors,last_error:lastError,response_age_ms:lastResponse?Math.round(performance.now()-lastResponse):null,sample_seq:D.sample_seq,recorded_rows:rows.length,hidden:document.hidden}},null,2)],{type:'application/json'}),'harness_diagnostics_'+Date.now()+'.json');$('diagnosticStatus').textContent='Diagnostics downloaded.'}catch(e){$('diagnosticStatus').textContent='Download failed: '+e.message}};
function calibrationInstructions(){const contact=$('referenceMode').value==='2'?'the reference metal':'your hand';$('instructionA').textContent='2 · HOOK A — Touch only Hook A with '+contact+'. Leave Hook B free.';$('instructionB').textContent='3 · HOOK B — Touch only Hook B with '+contact+'. Leave Hook A free.'}
$('referenceMode').onchange=calibrationInstructions;
function showCalibration(d){const running=!!d.calibration_running,completed=Number(d.calibration_completed)||0;
 // Keep the wizard selection local: calibration_mode is the saved prediction provenance.
 if(d.calibration_capture_mode==='hand'||d.calibration_capture_mode==='metal'){if(running||(completed>0&&completed<3))$('referenceMode').value=d.calibration_capture_mode==='metal'?'2':'1'}
 $('referenceMode').disabled=running||calSaving||(completed>0&&completed<3);calibrationInstructions();
 for(let step=1;step<=3;step++){$('calReady'+step).disabled=running||calSaving||(step!==1&&completed!==step-1);$('step'+step).classList.toggle('done',completed>=step)}
 $('calCancel').disabled=calSaving||(!running&&!completed);$('calClear').disabled=calSaving||running;
 $('calibrationProvenance').textContent=d.prediction_calibrated?'Saved reference: '+d.calibration_mode+'.':'Defaults active · uncalibrated.';
 $('calibrationStatus').textContent=d.calibration_error?'Calibration failed: '+d.calibration_error:running?'Collecting step '+d.calibration_step+'…':completed===3?'Calibration saved on device.':completed?'Step '+completed+' complete. Follow the next instruction, then press READY.':'Optional: select a reference and prepare the FREE condition.';
}
async function calibrationAction(action,step){if(calSaving)return;calSaving=true;settingsEpoch++;showCalibration(D);try{const fields={action};if(step){fields.step=step;fields.mode=$('referenceMode').value}const r=await deviceFetch('/calibration',{method:'POST',body:new URLSearchParams(fields)});if(!r.ok)throw Error(await r.text());$('calibrationStatus').textContent='Request accepted; awaiting device status.'}catch(e){$('calibrationStatus').textContent='Not started: '+e.message}finally{calSaving=false;settingsEpoch++}}
for(let step=1;step<=3;step++)$('calReady'+step).onclick=()=>calibrationAction('step',step);
$('calCancel').onclick=()=>calibrationAction('cancel');$('calClear').onclick=()=>calibrationAction('clear');

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
const colors=getComputedStyle(document.body);cx.strokeStyle=colors.getPropertyValue('--br');cx.lineWidth=1;for(let g=0;g<=4;g++){const y=g/4*h;cx.beginPath();cx.moveTo(0,y);cx.lineTo(w,y);cx.stroke()}
const pl=(z,c)=>{cx.beginPath();cx.strokeStyle=c;cx.lineWidth=2;z.forEach((v,i)=>{const x=X(i),y=Y(v);i?cx.lineTo(x,y):cx.moveTo(x,y)});cx.stroke()};
pl(A,colors.getPropertyValue('--amb'));pl(B,colors.getPropertyValue('--stl'));
cx.fillStyle=colors.getPropertyValue('--mut');cx.font='10px monospace';cx.fillText(Math.round(mx),5,12);cx.fillText(Math.round(mn),5,h-5)}
async function tick(){if(busy||(document.hidden&&!rec))return;busy=true;const epoch=settingsEpoch;
try{const response=await deviceFetch('/data',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const d=await response.json();if(epoch!==settingsEpoch)return;
const now=performance.now(),restarted=lastResponse&&d.uptime_ms<lastUptime,key=d.sample_seq+':'+d.sample_uptime_ms,fresh=key!==lastSampleKey||restarted;
if(restarted){A=[];B=[];M=[]}lastResponse=now;sampleAge=Number(d.sample_age_ms)||0;lastUptime=d.uptime_ms;responseCount++;lastError='';if(fresh){lastSampleSeen=now;lastSampleKey=key;sampleCount++}D=d;freshStatus();
$('deviceName').textContent=d.device_name;if(!nameDirty&&!deviceSaving)$('nameInput').value=d.device_name;
if(!deviceSaving){document.body.classList.toggle('light',!!d.light_mode);$('lightToggle').textContent=d.light_mode?'DARK MODE':'LIGHT MODE';$('lightToggle').disabled=false}showCalibration(d);
$('devid').textContent=d.id;$('gL').textContent='GUARD '+d.guard;
$('n1').textContent=d.sta_up?'LAN '+d.sta_ip+' '+d.rssi+'dBm':'LAN OFFLINE';
$('n2').textContent='AP '+d.ap_ip;$('n3').textContent=d.host;
const measurementValid=d.mutual_valid && d.hook_a_valid && d.hook_b_valid;
const st=measurementValid?d.state:'UNKNOWN',cl={'FREE':'free','WEAK LINK':'human','STRONG LINK':'short','CONTACT':'contact'}[st]||'free';
$('stB').className='box state '+cl+(d.predict?'':' off');
$('predictionStatus').textContent=d.predict?'ON':'OFF';
$('predictionDetails').hidden=!d.predict;$('classifierBox').hidden=!d.predict;$('calibrationBox').hidden=!d.predict;
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
if(fresh){A.push(d.raw1);B.push(d.raw2);M.push(d.mutual);if(A.length>MAX){A.shift();B.shift();M.shift()}draw();$('chartTime').textContent='Last sample '+ts(new Date())+' · #'+d.sample_seq+' · '+A.length+' samples shown · A amber / B slate'}
if(rec && fresh && rows.length<MAX_ROWS){rows.push({seq:d.sample_seq,uptime:d.sample_uptime_ms,predict:d.predict,prediction:d.state,calibrated:d.prediction_calibrated,reference:d.calibration_mode,t:new Date(),l:$('lab').value||'unlabeled',a:d.raw1,b:d.raw2,ap:d.a_p2p,bp:d.b_p2p,m:d.mutual,k:d.link,la:d.loadA,lb:d.loadB,ha:d.hkAn,hb:d.hkBn,s:d.state,b1:d.b1,b2:d.b2,b3:d.b3,av:d.hook_a_valid,bvalid:d.hook_b_valid,mv:d.mutual_valid,at:d.a_timeouts,bt:d.b_timeouts});$('cnt').textContent=rows.length;if(rows.length===MAX_ROWS){rec=false;$('bRec').textContent='START';$('bRec').className='pri';$('recordStatus').textContent='10,000-row limit reached. Recording stopped. Download CSV, then CLEAR to start a new buffer.'}}
}catch(e){requestErrors++;lastError=e.message;freshStatus()}finally{busy=false}}
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
$('bRec').onclick=()=>{if(!rec&&rows.length>=MAX_ROWS){$('recordStatus').textContent='Buffer full. Download CSV, then CLEAR before recording again.';return}rec=!rec;$('bRec').textContent=rec?'STOP':'START';$('bRec').className=rec?'':'pri'};
$('bClr').onclick=()=>{rows=[];$('cnt').textContent=0;$('recordStatus').textContent='Buffer cleared. Limit 10,000 fresh samples; background browsers may throttle recording.'};
$('bDl').onclick=()=>{if(!rows.length)return alert('Nothing recorded');
const h=['Sl.No','Timestamp','Label','HookA_mean','HookB_mean','A_p2p','B_p2p','Mutual','LinkIdx','LoadA','LoadB','HookA_st','HookB_st','State','Buckle1','Buckle2','Buckle3','HookA_valid','HookB_valid','Mutual_valid','A_timeouts','B_timeouts','SampleSeq','SampleUptime','PredictionEnabled','Prediction','Calibrated','ReferenceMode'];
const cell=value=>'"'+String(value??'').replace(/"/g,'""')+'"';const L=[h.map(cell).join(',')];rows.forEach((r,i)=>L.push([i+1,ts(r.t),r.l,r.a,r.b,r.ap,r.bp,r.m,r.k,r.la,r.lb,r.ha,r.hb,r.s,r.b1?'LOCKED':'OPEN',r.b2?'LOCKED':'OPEN',r.b3?'LOCKED':'OPEN',r.av,r.bvalid,r.mv,r.at,r.bt,r.seq,r.uptime,r.predict,r.prediction,r.calibrated,r.reference].map(cell).join(',')));
downloadBlob(new Blob([L.join('\r\n')],{type:'text/csv;charset=utf-8'}),'harness_'+Date.now()+'.csv')};
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
 }catch(e){$('wifiStatus').textContent=wifiSaveError||'Connection interrupted. Rejoin the device hotspot and open http://192.168.4.1/.'}
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
setInterval(freshStatus,250);setInterval(tick,500);document.addEventListener('visibilitychange',()=>{freshStatus();tick()});tick();
</script></body></html>
)rawliteral";
