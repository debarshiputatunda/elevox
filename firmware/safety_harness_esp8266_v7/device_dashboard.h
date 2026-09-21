#pragma once
const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>v7.2.0</title>
<style>
:root{--bg:#141413;--pnl:#1e1e1b;--pnl2:#292923;--field:#171714;--amb:#e2bf29;--stl:#a1adb7;--txt:#faf9f5;--mut:#b1b1a8;--ok:#6dd58a;--bad:#ff8275;--cy:#77ccda;--br:#3b3b34;--ln:#55554a}
body.light{--bg:#faf9f5;--pnl:#fff;--pnl2:#f0efea;--field:#faf9f5;--amb:#c98a1e;--stl:#586775;--txt:#141413;--mut:#64645b;--ok:#14743a;--bad:#bd3023;--cy:#00768d;--br:#deded5;--ln:#bdbdb2}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 Arial,Helvetica,sans-serif;background:var(--bg);color:var(--txt)}
header{display:flex;align-items:center;flex-wrap:wrap;gap:12px;padding:12px 24px;background:var(--pnl);border-bottom:1px solid var(--br);position:sticky;top:0;z-index:9}header h1{font-size:16px;margin:0;font-weight:700;letter-spacing:.5px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--bad)}.dot.on{background:var(--ok)}.id{color:var(--mut);font-size:12px}.wrap{max-width:1040px;margin:auto;padding:24px}.net,.devicebar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px}.net{font-size:12px;color:var(--mut)}.devicebar details{margin-left:auto}.devicebar form{margin-top:8px}summary{cursor:pointer}#deviceName{font-weight:700;font-size:16px}#nameInput{width:min(260px,100%)}
.box{background:var(--pnl);border:1px solid var(--br);border-radius:6px;overflow:hidden;min-width:0}.box h2{font-size:12px;letter-spacing:.8px;font-weight:700;margin:0;padding:12px 16px;background:var(--pnl2);border-bottom:1px solid var(--br)}.box .bd{padding:16px}.state{padding:16px;text-align:center;margin-bottom:16px}.state .lbl{font-size:12px;letter-spacing:1px;color:var(--mut)}.state .v{font-size:32px;font-weight:700;margin:8px 0 4px}.state .exp{font-size:14px;color:var(--mut)}.state.free .v{color:var(--ok)}.state.human .v{color:var(--amb)}.state.short .v{color:var(--cy)}.state.contact .v{color:var(--stl)}
.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:16px}.g2{columns:2;column-gap:16px}.g2>.box{break-inside:avoid;margin-bottom:16px}.mtr{padding:16px}.mtr .t{font-size:12px;color:var(--mut);display:flex;justify-content:space-between;gap:8px}.mtr .n{font:700 32px/1.3 ui-monospace,SFMono-Regular,Consolas,monospace;margin:4px 0}.mtr .s{font-size:12px;color:var(--mut)}.trk{height:8px;background:var(--field);margin-top:8px;overflow:hidden;border-radius:4px}.fl{height:100%;transition:width .15s}.tag{font-size:11px;padding:0 4px;font-weight:700}.t-ok{color:var(--ok)}.t-amb{color:var(--amb)}.t-cy{color:var(--cy)}.t-mut{background:var(--pnl2);color:var(--mut)}
.bkrow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.bk{padding:12px 8px;text-align:center;border:1px solid var(--br);background:var(--field);border-radius:4px}.bk .bn{font-size:12px;color:var(--mut)}.bk .bs{font-size:14px;font-weight:700;margin-top:4px}.bk.lk .bs{color:var(--ok)}.bk.op{border-color:var(--bad)}.bk.op .bs{color:var(--bad)}.alarm-setting{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:16px;padding-top:16px;border-top:1px solid var(--br)}.alarm-setting .hint{margin:4px 0 0}.alarm-setting button{flex-shrink:0}
canvas{width:100%;height:160px;background:var(--pnl);border:1px solid var(--br);border-radius:4px;display:block}.kv{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;color:var(--mut)}.kv b{color:var(--txt)}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
input,select,button,.button{font:inherit;min-height:44px;padding:8px 12px;border:1px solid var(--br);background:var(--field);color:var(--txt);border-radius:4px;max-width:100%}input{width:92px}input[type=range]{width:130px;padding:0;accent-color:var(--amb)}input[type=checkbox]{min-height:0}input[type=number]{font-variant-numeric:tabular-nums}button,.button{cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;text-decoration:none}button:hover,.button:hover{border-color:var(--amb)}button:disabled{opacity:.5;cursor:default}.pri,.chip.on{background:var(--amb);color:#141413;border-color:var(--amb);font-weight:700}.tg{font-weight:700}.tg.on{border-color:var(--ok);color:var(--ok)}.tg.off{color:var(--mut)}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--cy);outline-offset:2px}
.hint{color:var(--mut);font-size:12px;line-height:1.5;margin-top:8px}p{margin:8px 0}p:empty,.hint:empty{display:none}.ab{display:none;padding:12px;text-align:center;font-weight:700;letter-spacing:1px;margin-bottom:16px;border-radius:4px}.ab-b,.ab-s{background:#bd3023;color:#fff}.ab-h{background:var(--amb);color:#141413}.ab-m{background:var(--cy);color:#141413}.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.chip{padding:8px 12px;min-height:44px;border:1px solid var(--br);background:var(--field);font-size:12px;cursor:pointer;border-radius:4px}
a{color:var(--amb)}body.light a:not(.button){color:#8c5e12}[hidden]{display:none!important}#predictionDetails{margin-top:8px}.stream{padding:16px;margin-bottom:16px;border-left:3px solid var(--ok)}.stream.stale{border-left-color:var(--bad)}.stream.stale #streamStatus{color:var(--bad)}#streamStats,#chartTime{font-variant-numeric:tabular-nums}#chartTime{margin:8px 0 16px}.step{margin-top:12px;padding:12px;border:1px solid var(--br);border-radius:4px}.step p{margin:0 0 8px}.step.done{border-left:3px solid var(--ok)}.calhead{margin:0 0 12px}#wifiForm{display:flex;align-items:center;flex-wrap:wrap;gap:8px}#wifiAddresses{overflow-wrap:anywhere}
.range-row{display:grid;grid-template-columns:32px minmax(0,1fr) 24px minmax(0,1fr);gap:8px;align-items:center;margin-bottom:12px}.range-row strong{grid-column:1/-1}.range-row input{width:100%!important}
@media(max-width:720px){header{padding:12px 16px}.wrap{padding:16px}.g3{grid-template-columns:1fr}.g2{columns:1}.devicebar details{margin-left:0;width:100%}.net{gap:8px}.state .v{font-size:28px}.bkrow{gap:8px}.bk .bn{font-size:11px}#wifiForm{align-items:stretch;flex-direction:column}#wifiForm input{width:100%!important}#wifiForm input[type=checkbox]{width:auto!important}.alarm-setting{align-items:flex-start}.alarm-setting button{min-width:64px}}
@media(prefers-reduced-motion:reduce){.fl{transition:none}}
</style></head><body>
<header><div class="dot" id="conn" aria-label="Connection status"></div><h1>v7.2.0</h1><button id="lightToggle" class="tg" style="margin-left:auto" disabled>LIGHT MODE</button></header>
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

<div class="box" style="margin-bottom:16px"><h2>BUCKLE STATUS</h2><div class="bd"><div class="bkrow">
<div class="bk" id="k1"><div class="bn">BUCKLE 1</div><div class="bs" id="s1">-</div></div>
<div class="bk" id="k2"><div class="bn">BUCKLE 2</div><div class="bs" id="s2">-</div></div>
<div class="bk" id="k3"><div class="bn">BUCKLE 3</div><div class="bs" id="s3">-</div></div>
</div><div class="alarm-setting"><div><strong>Buckle alarm</strong><p class="hint" id="buckleAlarmHint">Waiting for saved setting…</p></div><button id="buckleAlarmToggle" class="tg" role="switch" aria-checked="true" aria-label="Buckle alarm" aria-describedby="buckleAlarmHint" disabled>ON</button></div><p id="buckleAlarmStatus" class="hint" role="status" aria-live="polite"></p></div></div>

<canvas id="ch" width="880" height="160" aria-label="Hook A and B recent readings"></canvas><p class="hint" id="chartTime">Waiting for sensor samples…</p>

<div class="g2">
<div class="box"><h2>SYSTEM</h2><div class="bd">
<div class="kv"><span>BATTERY</span><b><span id="bt">-</span>% / <span id="bv">-</span>V</b></div>
<div class="kv"><span>ALARM</span><b id="md">-</b></div>
<div class="kv"><span>FREE HEAP</span><b id="hp">-</b></div>
<div class="row" style="margin-top:12px"><button id="bBeep">TEST BEEP</button><a class='button' href='/update'>FIRMWARE UPDATE</a></div>
</div></div>

<div class="box"><h2>BUZZER</h2><div class="bd">
<div class="row"><button class="tg" id="tBuz">BUZZER</button><input type="range" id="vol" min="0" max="100"><b id="volV">-</b>%</div>
<div class="kv" style="margin-top:8px"><span>BUCKLE</span><select id="pB"></select></div>
<div class="kv"><span>HOOK</span><select id="pH"></select></div>
<div class="kv"><span>MANUAL</span><select id="pM"></select></div>
<div class="row" style="margin-top:8px"><button class="pri" id="bPat">APPLY</button></div>
<div class="hint" id="volH">-</div>
</div></div>

<div class="box"><h2>SENSING MODE</h2><div class="bd">
<form id="sensingForm" class="row"><label for="sensingMode">Method</label><select id="sensingMode" disabled style="max-width:100%"><option value="0">V6 HIGH guard · A ×16, then B ×16</option><option value="1" selected>LOW guard by hook · A ×16, then B ×16</option><option value="2">Alternating LOW guard · (A, B) ×16</option></select><button id="sensingSave" class="pri" disabled>SAVE MODE</button><button id="sensingRefresh" type="button" disabled>RELOAD SAVED</button></form>
<p id="sensingCurrent" class="hint">Waiting for saved mode…</p><p id="sensingStatus" role="status" aria-live="polite"></p>
<p class="hint">Saved on device. Changing modes resets smoothing and loads that mode’s calibration. Alarm ranges stay unchanged: verify ranges and collect a new reference for each mode. Finish or cancel an active calibration before switching.</p></div></div>
<div class="box"><h2>SMOOTHING / PREDICTION</h2><div class="bd"><p id="controlStatus" role="status"></p>
<div class="row"><button class="tg" id="tEma">EMA</button><input type="number" id="alpha" min="1" max="100"><span class="hint" style="margin:0">alpha%</span></div>
<div class="row" style="margin-top:8px"><button class="tg" id="tPred">PREDICT</button><span class="hint" id="gL"></span><span id="tGuard" hidden></span></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0">SPREAD GAIN</span><input type="number" id="gain" min="1" max="10"><button class="pri" id="bGain">SET</button></div>
<div class="hint">Each hook uses the mean of 16 discharge samples. The selected mode sets the other hook’s guard level and sampling order. Coupling resets passively. These readings do not confirm mechanical fastening.</div>
</div></div>

<div class="box"><h2>HOOK ALARM RANGES</h2><div class="bd">
<form id="rangeForm">
<div class="range-row"><strong>Hook A · range 1</strong><label for="a0_min">From</label><input id="a0_min" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"><label for="a0_max">To</label><input id="a0_max" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"></div>
<div class="range-row"><strong>Hook A · range 2</strong><label for="a1_min">From</label><input id="a1_min" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"><label for="a1_max">To</label><input id="a1_max" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"></div>
<div class="range-row"><strong>Hook B · range 1</strong><label for="b0_min">From</label><input id="b0_min" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"><label for="b0_max">To</label><input id="b0_max" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"></div>
<div class="range-row"><strong>Hook B · range 2</strong><label for="b1_min">From</label><input id="b1_min" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"><label for="b1_max">To</label><input id="b1_max" type="number" min="0" max="1000000" step="1" required disabled style="width:116px"></div>
<div class="row" style="margin-top:8px"><button class="pri" id="rangeSave" disabled>SAVE RANGES</button><button id="rangeRefresh" type="button" disabled>RELOAD SAVED</button></div></form>
<div id="rangeCurrent" class="hint">Waiting for saved ranges…</div><p id="rangeStatus" role="status" aria-live="polite"></p>
<p class="hint">The hook alarm requires BOTH hooks inside either of their own ranges; they may be in different ranges. Endpoints are inclusive, in raw discharge units (0–1,000,000). Range 1 must end before range 2 starts. Defaults: 10–1,800 and 10,000–1,000,000 for each hook.</p>
<p class="hint">Alarm uses fresh unsmoothed readings. Main meters and charts show smoothed readings. Saved on device and synchronized with the website. Website changes appear here unless you have unsaved edits.</p><p id="rangeRaw" class="hint"></p></div></div>

<div class="box" id="calibrationBox"><h2>OPTIONAL GUIDED CALIBRATION</h2><div class="bd"><p class="hint calhead">Works immediately with defaults. For a reference, collect 5 seconds in each condition. Nothing starts until you press its READY button. Keep hooks still during collection.</p><label for="referenceMode">Reference contact</label> <select id="referenceMode"><option value="1">Hand</option><option value="2">Metal</option></select><p id="calibrationProvenance" class="hint"></p><p id="calibrationStatus" role="status" aria-live="polite"></p>
<div class="step" id="step1"><p>1 · FREE — Leave both hooks separate, untouched and away from metal.</p><button id="calReady1">READY · CAPTURE FREE (5s)</button></div>
<div class="step" id="step2"><p id="instructionA">2 · HOOK A — Touch only Hook A with your hand. Leave Hook B free.</p><button id="calReady2" disabled>READY · CAPTURE A (5s)</button></div>
<div class="step" id="step3"><p id="instructionB">3 · HOOK B — Touch only Hook B with your hand. Leave Hook A free.</p><button id="calReady3" disabled>READY · CAPTURE B (5s)</button></div>
<div class="row" style="margin-top:12px"><button id="calCancel">CANCEL CAPTURE</button><button id="calClear">USE DEFAULTS</button></div><p class="hint">References describe electrical response only; they cannot prove fastening or identify every material. Ambiguous readings remain UNKNOWN.</p></div></div>
<div class="box" id="classifierBox"><h2>CLASSIFIER LIMITS</h2><div class="bd">
<div class="row"><span class="hint" style="margin:0;width:52px">strong&lt;</span><input type="number" id="mSh"><span class="hint" style="margin:0;width:52px">weak&lt;</span><input type="number" id="mBr"><button class="pri" id="bMut">SET</button></div>
<div class="row" style="margin-top:8px"><span class="hint" style="margin:0;width:88px">hook delta</span><input type="number" id="hd"><button class="pri" id="bHd">SET</button></div>
<div class="hint">Classifier limits require measurements for the selected sensing mode. Link strength alone does not identify the contact material or prove fastening.</div>
</div></div>

<div class="box"><h2>RECORD</h2><div class="bd">
<div class="row"><input type="text" id="lab" style="width:150px" placeholder="label"><button class="pri" id="bRec">START</button>
<button id="bClr">CLEAR</button><button id="bDl">CSV</button><span class="hint" style="margin:0 0 0 auto"><b id="cnt">0</b> rows</span></div>
<div class="chips" id="chips"></div><p class="hint" id="recordStatus">Up to 10,000 fresh samples per recording buffer. Unchanged readings are included. Recording continues while hidden, but browsers may throttle background tabs; gaps cannot be recovered.</p>
</div></div>
</div>
<div class="box" style="margin:16px 0"><h2>ROUTER WI-FI</h2><div class="bd">
<p id="wifiAddresses">Hotspot: http://192.168.4.1 — no hotspot password required.</p>
<div class="row"><select id="wifiProfiles" aria-label="Saved router networks"><option value="">New network</option></select>
<button id="wifiConnect">CONNECT</button><button id="wifiDefault">SET DEFAULT</button><button id="wifiDelete">DELETE</button></div>
<form id="wifiForm" style="margin-top:12px">
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
let settingsEpoch=0,buckleSaving=false;
function showBuckleAlarm(enabled){
 const button=$('buckleAlarmToggle');button.textContent=enabled?'ON':'OFF';button.className='tg '+(enabled?'on':'off');button.setAttribute('aria-checked',String(enabled));button.disabled=buckleSaving;
 $('buckleAlarmHint').textContent=enabled?'Open buckles can trigger the local alarm.':'Local buckle alarm is off. Buckle readings remain live; other alarm settings still apply.';
}
$('buckleAlarmToggle').onclick=async()=>{
 if(buckleSaving||!D)return;const previous=D.buckle_alarm_enabled,enabled=!previous;
 buckleSaving=true;settingsEpoch++;showBuckleAlarm(enabled);$('buckleAlarmStatus').textContent='Saving…';
 try{const response=await deviceFetch('/buckle-alarm',{method:'POST',body:new URLSearchParams({enabled:enabled?'1':'0'})});if(!response.ok)throw Error(await response.text());const result=await response.json();if(result.saved!==true||typeof result.enabled!=='boolean')throw Error('Invalid device response');D.buckle_alarm_enabled=result.enabled;$('buckleAlarmStatus').textContent='Saved on device.';}
 catch(e){D.buckle_alarm_enabled=previous;$('buckleAlarmStatus').textContent='Not saved: '+e.message;}
 finally{settingsEpoch++;buckleSaving=false;showBuckleAlarm(D.buckle_alarm_enabled);tick()}
};
const RANGE_IDS=['a0_min','a0_max','a1_min','a1_max','b0_min','b0_max','b1_min','b1_max'];
let rangeDirty=false,rangeSaving=false,rangeRevision=null,rangeLatest=null;
function validRanges(r){return r&&['a','b'].every(h=>Array.isArray(r[h])&&r[h].length===2&&r[h].every(b=>Array.isArray(b)&&b.length===2&&b.every(v=>Number.isInteger(v)&&v>=0&&v<=1000000)&&b[0]<=b[1])&&r[h][0][1]<r[h][1][0])}
function validRangeRevision(v){return Number.isInteger(v)&&v>=1&&v<=4294967295}
function rangeRevisionOlder(candidate,current){return candidate!==current&&((candidate-current)>>>0)>=2147483648}
function rangeControls(){const locked=rangeSaving||!rangeLatest;for(const id of RANGE_IDS)$(id).disabled=locked;$('rangeSave').disabled=locked;$('rangeRefresh').disabled=locked}
function showRanges(d,restarted=false){
 const r=d.hook_alarm_ranges,revision=d.hook_ranges_revision;
 if(!validRanges(r)||!validRangeRevision(revision))return;
 if(restarted){rangeLatest=null;if(rangeDirty)rangeRevision=null;if(rangeDirty)$('rangeStatus').textContent='Device restarted. Reload saved ranges before saving your edits.'}
 if(rangeLatest&&rangeRevisionOlder(revision,rangeLatest.revision))return;
 rangeLatest={ranges:r,revision};
 if(!rangeDirty&&!rangeSaving){RANGE_IDS.forEach((id,i)=>$(id).value=r[i<4?'a':'b'][Math.floor(i%4/2)][i%2]);rangeRevision=revision}
 $('rangeCurrent').textContent='Saved: A '+r.a.map(b=>b.join('–')).join(' / ')+' · B '+r.b.map(b=>b.join('–')).join(' / ')+' · revision '+revision;
 if(rangeDirty&&revision!==rangeRevision)$('rangeStatus').textContent='Saved ranges changed. Your edits are preserved. Reload saved ranges before editing again.';
 $('rangeRaw').textContent='Alarm raw: A '+(d.hook_a_valid?d.hook_raw_a:'invalid')+' · B '+(d.hook_b_valid?d.hook_raw_b:'invalid');rangeControls();
}
for(const id of RANGE_IDS)$(id).addEventListener('input',()=>{rangeDirty=true;$('rangeStatus').textContent='Unsaved ranges. Press SAVE RANGES to apply.'});
$('rangeRefresh').onclick=()=>{if(rangeSaving||!rangeLatest)return;rangeDirty=false;showRanges({...D,hook_alarm_ranges:rangeLatest.ranges,hook_ranges_revision:rangeLatest.revision});$('rangeStatus').textContent='Current saved ranges loaded.'};
$('rangeForm').onsubmit=async e=>{
 e.preventDefault();if(rangeSaving||!rangeLatest)return;
 rangeSaving=true;const epoch=++settingsEpoch;rangeControls();$('rangeStatus').textContent='Saving ranges…';
 try{
  const values=RANGE_IDS.map(id=>$(id).value.trim());
  if(values.some(v=>!/^\d+$/.test(v)))throw Error('Use whole numbers from 0 to 1000000');
  const nums=values.map(Number),ranges={a:[nums.slice(0,2),nums.slice(2,4)],b:[nums.slice(4,6),nums.slice(6,8)]};
  if(!validRanges(ranges))throw Error('Each range needs min ≤ max; range 1 must end before range 2 starts (0–1000000)');
  if(rangeRevision!==rangeLatest.revision)throw Error('Revision conflict. Reload saved ranges before editing again');
  const body=new URLSearchParams({expected_revision:rangeRevision});RANGE_IDS.forEach((id,i)=>body.set(id,nums[i]));
  const response=await deviceFetch('/hook-ranges',{method:'POST',body});
  if(response.status===409)throw Error('Revision conflict. Reload saved ranges before editing again');
  if(!response.ok)throw Error(await response.text());
  const result=await response.json();if(epoch!==settingsEpoch)throw Error('Settings changed while saving; reload saved ranges to verify');
  if(result.saved!==true||!validRanges(result.hook_alarm_ranges)||!validRangeRevision(result.hook_ranges_revision)||(result.hook_ranges_revision!==rangeRevision&&result.hook_ranges_revision!==(rangeRevision===4294967295?1:rangeRevision+1))||!['a','b'].every(h=>JSON.stringify(result.hook_alarm_ranges[h])===JSON.stringify(ranges[h])))throw Error('Invalid save acknowledgment; reload saved ranges to verify');
  D.hook_alarm_ranges=result.hook_alarm_ranges;D.hook_ranges_revision=result.hook_ranges_revision;rangeDirty=false;
  $('rangeStatus').textContent='Saved on device. Website synchronization follows when connected.';
 }catch(error){rangeDirty=true;$('rangeStatus').textContent='Not confirmed: '+error.message}
 finally{settingsEpoch++;rangeSaving=false;showRanges(D);rangeControls();tick()}
};
const PRE=['Free','Body both','Hooks shorted','Grounded metal','Hook A only','Hook B only','Over clothing','Anchor point','Mixed usage'];
const PN=['Accelerating','Double pulse','Long steady','Rapid chirp','Triple burst','Slow beep','SOS','Urgent burst'];
let A=[],B=[],M=[],MAX=180,rec=false,rows=[],busy=false,init=false,D={};
let lastResponse=0,lastSampleSeen=0,lastSampleKey='',responseCount=0,sampleCount=0,requestErrors=0,lastError='',sampleAge=0,lastUptime=0,deviceSaving=false,nameDirty=false,calSaving=false;
const MAX_ROWS=10000;
const SENSING_NAMES=['v6-high','low-batch','low-alternating'];
let sensingDirty=false,sensingSaving=false,sensingEpoch=0;
function sensingControls(){const locked=sensingSaving||!Number.isInteger(D.sensing_mode);$('sensingMode').disabled=locked;$('sensingSave').disabled=locked;$('sensingRefresh').disabled=locked}
function showSensing(d){if(!sensingDirty&&!sensingSaving)$('sensingMode').value=String(d.sensing_mode);$('sensingCurrent').textContent='Device: '+d.sensing_name+' · GUARD '+d.guard+' · revision '+d.sensing_revision;sensingControls()}
$('sensingMode').onchange=()=>{sensingDirty=true;$('sensingStatus').textContent='Unsaved selection. Press SAVE MODE to apply.'};
$('sensingRefresh').onclick=()=>{sensingDirty=false;showSensing(D);$('sensingStatus').textContent='Current device mode loaded.'};
$('sensingForm').onsubmit=async e=>{e.preventDefault();if(sensingSaving||!Number.isInteger(D.sensing_mode))return;
 const mode=Number($('sensingMode').value),epoch=++sensingEpoch;sensingSaving=true;settingsEpoch++;sensingControls();$('sensingStatus').textContent='Saving mode…';
 try{const response=await deviceFetch('/sensing',{method:'POST',body:new URLSearchParams({mode})});if(!response.ok)throw Error(await response.text());const result=await response.json();if(epoch!==sensingEpoch)return;if(result.saved!==true||result.mode!==mode)throw Error('Device did not confirm selected mode');
 sensingDirty=false;$('sensingMode').value=String(result.mode);$('sensingStatus').textContent='Saved '+SENSING_NAMES[result.mode]+'. Verify alarm ranges and this mode’s calibration.';
 }catch(error){if(epoch===sensingEpoch){sensingDirty=true;$('sensingStatus').textContent='Not saved: '+error.message}}
 finally{if(epoch===sensingEpoch){sensingSaving=false;settingsEpoch++;sensingControls();tick()}}
};

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
$('diagnostics').onclick=async()=>{try{const r=await deviceFetch('/diagnostics',{cache:'no-store'});if(!r.ok)throw Error(await r.text());const device=await r.json();downloadBlob(new Blob([JSON.stringify({device,browser:{captured_at:new Date().toISOString(),response_count:responseCount,observed_sample_count:sampleCount,request_errors:requestErrors,last_error:lastError,response_age_ms:lastResponse?Math.round(performance.now()-lastResponse):null,sample_seq:D.sample_seq,sensing_mode:D.sensing_mode,sensing_name:D.sensing_name,sensing_revision:D.sensing_revision,recorded_rows:rows.length,hidden:document.hidden}},null,2)],{type:'application/json'}),'harness_diagnostics_'+Date.now()+'.json');$('diagnosticStatus').textContent='Diagnostics downloaded.'}catch(e){$('diagnosticStatus').textContent='Download failed: '+e.message}};
function calibrationInstructions(){const contact=$('referenceMode').value==='2'?'the reference metal':'your hand';$('instructionA').textContent='2 · HOOK A — Touch only Hook A with '+contact+'. Leave Hook B free.';$('instructionB').textContent='3 · HOOK B — Touch only Hook B with '+contact+'. Leave Hook A free.'}
$('referenceMode').onchange=calibrationInstructions;
function showCalibration(d){const running=!!d.calibration_running,completed=Number(d.calibration_completed)||0;
 // Keep the wizard selection local: calibration_mode is the saved prediction provenance.
 if(d.calibration_capture_mode==='hand'||d.calibration_capture_mode==='metal'){if(running||(completed>0&&completed<3))$('referenceMode').value=d.calibration_capture_mode==='metal'?'2':'1'}
 $('referenceMode').disabled=running||calSaving||sensingSaving||(completed>0&&completed<3);calibrationInstructions();
 for(let step=1;step<=3;step++){$('calReady'+step).disabled=running||calSaving||sensingSaving||(step!==1&&completed!==step-1);$('step'+step).classList.toggle('done',completed>=step)}
 $('calCancel').disabled=calSaving||sensingSaving||(!running&&!completed);$('calClear').disabled=calSaving||sensingSaving||running;
 $('calibrationProvenance').textContent='For '+d.sensing_name+': '+(d.prediction_calibrated?'saved reference '+d.calibration_mode+'.':'defaults active · uncalibrated.');
 $('calibrationStatus').textContent=d.calibration_error?'Calibration failed: '+d.calibration_error:running?'Collecting step '+d.calibration_step+'…':completed===3?'Calibration saved on device.':completed?'Step '+completed+' complete. Follow the next instruction, then press READY.':'Optional: select a reference and prepare the FREE condition.';
}
async function calibrationAction(action,step){if(calSaving||sensingSaving)return;calSaving=true;settingsEpoch++;showCalibration(D);try{const fields={action};if(step){fields.step=step;fields.mode=$('referenceMode').value}const r=await deviceFetch('/calibration',{method:'POST',body:new URLSearchParams(fields)});if(!r.ok)throw Error(await r.text());$('calibrationStatus').textContent='Request accepted; awaiting device status.'}catch(e){$('calibrationStatus').textContent='Not started: '+e.message}finally{calSaving=false;settingsEpoch++}}
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
async function tick(){if(busy||sensingSaving||buckleSaving||rangeSaving||(document.hidden&&!rec))return;busy=true;const epoch=settingsEpoch;
try{const response=await deviceFetch('/data',{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const d=await response.json();if(epoch!==settingsEpoch)return;
const now=performance.now(),restarted=lastResponse&&d.uptime_ms<lastUptime,key=d.sample_seq+':'+d.sample_uptime_ms,fresh=key!==lastSampleKey||restarted;
const sensingChanged=lastResponse&&(d.sensing_mode!==D.sensing_mode||d.sensing_revision!==D.sensing_revision);
if(restarted||sensingChanged){A=[];B=[];M=[];draw();$('chartTime').textContent='Mode changed or device restarted · waiting for a new sensor sample…'}lastResponse=now;sampleAge=Number(d.sample_age_ms)||0;lastUptime=d.uptime_ms;responseCount++;lastError='';if(fresh){lastSampleSeen=now;lastSampleKey=key;sampleCount++}D=d;freshStatus();
$('deviceName').textContent=d.device_name;if(!nameDirty&&!deviceSaving)$('nameInput').value=d.device_name;
if(!deviceSaving){document.body.classList.toggle('light',!!d.light_mode);$('lightToggle').textContent=d.light_mode?'DARK MODE':'LIGHT MODE';$('lightToggle').disabled=false}showCalibration(d);showSensing(d);showBuckleAlarm(d.buckle_alarm_enabled);
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
 !measurementValid?'Measurement incomplete: waiting for a valid frame or passive reset. No fastening conclusion.':
 st==='STRONG LINK'?'Strong electrical link: touching hooks and hooks on shared metal may look identical.':
 st==='WEAK LINK'?'Weaker electrical coupling; material and fastening are unverified.':
 'Electrical loading only; mechanical fastening is unverified.';
$('mV').textContent=d.mutual_valid?d.link:'—';$('mRaw').textContent=d.mutual_valid?d.mutual:'unknown';
$('mTag').textContent=!d.mutual_valid?'UNKNOWN':d.mutual<d.msh?'STRONG':d.mutual<d.mbr?'WEAK':'NO RISE';
$('mTag').className='tag t-mut';
$('mF').style.width=(d.mutual_valid?Math.min(100,d.link/3400*100):0)+'%';
$('senseInfo').textContent='Timed-out samples: A '+d.a_timeouts+'/16, B '+d.b_timeouts+'/16. Coupling valid: '+d.mutual_valid;
$('aV').textContent=d.hook_a_valid?d.raw1:'—';$('bV').textContent=d.hook_b_valid?d.raw2:'—';
$('aR').textContent=d.predict?(d.loadA>0?'+':'')+d.loadA:'—';$('bR').textContent=d.predict?(d.loadB>0?'+':'')+d.loadB:'—';
$('aP').textContent=d.a_p2p;$('bP').textContent=d.b_p2p;
$('aTag').textContent=d.predict?(d.hook_a_valid?d.hkAn:'UNKNOWN'):'OFF';$('bTag').textContent=d.predict?(d.hook_b_valid?d.hkBn:'UNKNOWN'):'OFF';
$('aTag').className='tag '+(d.hkA==2?'t-cy':d.hkA==1?'t-amb':'t-ok');
$('bTag').className='tag '+(d.hkB==2?'t-cy':d.hkB==1?'t-amb':'t-ok');
$('aF').style.width=(d.hook_a_valid?Math.min(100,d.raw1/16000*100):0)+'%';
$('bF').style.width=(d.hook_b_valid?Math.min(100,d.raw2/16000*100):0)+'%';
[[1,d.b1],[2,d.b2],[3,d.b3]].forEach(([i,v])=>{$('k'+i).className='bk '+(v?'lk':'op');$('s'+i).textContent=v?'LOCKED':'OPEN'});
$('bt').textContent=d.batt_pct;$('bv').textContent=d.batt_v;$('md').textContent=d.mode;$('hp').textContent=d.heap;
const ab=$('ab');if(d.mode!=='NONE'){ab.style.display='block';ab.textContent='ALARM '+d.mode;ab.className='ab ab-'+d.mode[0].toLowerCase()}else ab.style.display='none';
tg($('tEma'),d.ema);tg($('tPred'),d.predict);tg($('tGuard'),d.guard==='HIGH');tg($('tBuz'),d.buzz);
$('tGuard').textContent='GUARD '+d.guard;$('tBuz').textContent=d.buzz?'BUZZER ON':'BUZZER OFF';
$('volV').textContent=d.vol;
$('volH').textContent=d.passive?'PWM drive: volume and pitch both active.':'Active buzzer has its own oscillator, so volume control is limited. Full range arrives with the bare piezo.';
showRanges(d,restarted);
if(!init){$('alpha').value=d.alpha;$('mSh').value=d.msh;$('mBr').value=d.mbr;$('pB').value=d.pb;$('pH').value=d.ph;$('pM').value=d.pm;$('vol').value=d.vol;$('gain').value=d.gain;$('hd').value=d.hd;init=true}
if(fresh){A.push(d.raw1);B.push(d.raw2);M.push(d.mutual);if(A.length>MAX){A.shift();B.shift();M.shift()}draw();$('chartTime').textContent='Last sample '+ts(new Date())+' · #'+d.sample_seq+' · '+A.length+' samples shown · A amber / B slate'}
if(rec && fresh && rows.length<MAX_ROWS){rows.push({sensingMode:d.sensing_mode,sensingName:d.sensing_name,sensingRevision:d.sensing_revision,seq:d.sample_seq,uptime:d.sample_uptime_ms,predict:d.predict,prediction:d.state,calibrated:d.prediction_calibrated,reference:d.calibration_mode,t:new Date(),l:$('lab').value||'unlabeled',a:d.raw1,b:d.raw2,ap:d.a_p2p,bp:d.b_p2p,m:d.mutual,k:d.link,la:d.loadA,lb:d.loadB,ha:d.hkAn,hb:d.hkBn,s:d.state,b1:d.b1,b2:d.b2,b3:d.b3,av:d.hook_a_valid,bvalid:d.hook_b_valid,mv:d.mutual_valid,at:d.a_timeouts,bt:d.b_timeouts});$('cnt').textContent=rows.length;if(rows.length===MAX_ROWS){rec=false;$('bRec').textContent='START';$('bRec').className='pri';$('recordStatus').textContent='10,000-row limit reached. Recording stopped. Download CSV, then CLEAR to start a new buffer.'}}
}catch(e){requestErrors++;lastError=e.message;freshStatus()}finally{busy=false}}
const go=async q=>{settingsEpoch++;try{const r=await deviceFetch('/config?'+q);if(!r.ok)throw Error(await r.text());$('controlStatus').textContent='';}catch(e){$('controlStatus').textContent='Setting not saved: '+e.message}finally{settingsEpoch++}};
$('tEma').onclick=()=>go('ema='+(D.ema?0:1));
$('tPred').onclick=()=>go('predict='+(D.predict?0:1));
// Guard level follows the saved sensing mode.
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
const h=['Sl.No','Timestamp','Label','HookA_mean','HookB_mean','A_p2p','B_p2p','Mutual','LinkIdx','LoadA','LoadB','HookA_st','HookB_st','State','Buckle1','Buckle2','Buckle3','HookA_valid','HookB_valid','Mutual_valid','A_timeouts','B_timeouts','SampleSeq','SampleUptime','PredictionEnabled','Prediction','Calibrated','ReferenceMode','SensingMode','SensingName','SensingRevision'];
const cell=value=>'"'+String(value??'').replace(/"/g,'""')+'"';const L=[h.map(cell).join(',')];rows.forEach((r,i)=>L.push([i+1,ts(r.t),r.l,r.a,r.b,r.ap,r.bp,r.m,r.k,r.la,r.lb,r.ha,r.hb,r.s,r.b1?'LOCKED':'OPEN',r.b2?'LOCKED':'OPEN',r.b3?'LOCKED':'OPEN',r.av,r.bvalid,r.mv,r.at,r.bt,r.seq,r.uptime,r.predict,r.prediction,r.calibrated,r.reference,r.sensingMode,r.sensingName,r.sensingRevision].map(cell).join(',')));
downloadBlob(new Blob([L.join('\r\n')],{type:'text/csv;charset=utf-8'}),'harness_'+Date.now()+'.csv')};
let wifiEpoch=0,wifiInitialized=false,wifiSaving=false,wifiPolling=false,wifiDirty=false,wifiSaveError='',profiles=[],wifiSignature='';
const wifiText={'startup-wait':'Hotspot ready. Automatic router connection waits 60 seconds after boot; CONNECT works now.',connected:'Connected to router',connecting:'Connecting (up to 30 seconds)…',paused:'Automatic router retry paused while the hotspot is in use and for 2 minutes afterward. CONNECT works now.',
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
setInterval(freshStatus,250);setInterval(tick,100);document.addEventListener('visibilitychange',()=>{freshStatus();tick()});tick();
</script></body></html>
)rawliteral";
