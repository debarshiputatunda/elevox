#pragma once
void loadDevicePreferences(){
  EEPROM.get(1024,preferences);
  if(!validPreferences(preferences))preferences=makePreferences(apName.c_str(),false);
  apName=preferences.name;
}
void saveDevicePreferences(){
  if(!server.hasArg("name")&&!server.hasArg("light")){server.send(400,"text/plain","Name or theme required");return;}
  String name=server.hasArg("name")?server.arg("name"):String(preferences.name);
  if(name.length()!=strlen(name.c_str())||!validDeviceName(name.c_str())){
    server.send(400,"text/plain","Name: 1-32 letters, digits, spaces, hyphens or underscores; no leading/trailing spaces");return;
  }
  bool light=preferences.light;
  if(server.hasArg("light")){
    String value=server.arg("light");
    if(value!="0"&&value!="1"){server.send(400,"text/plain","Theme must be 0 or 1");return;}light=value=="1";
  }
  DevicePreferences candidate=makePreferences(name.c_str(),light),previous;
  EEPROM.get(1024,previous);
  if(memcmp(&candidate,&preferences,sizeof(candidate))!=0){
    EEPROM.put(1024,candidate);
    if(!EEPROM.commit()){EEPROM.put(1024,previous);server.send(500,"text/plain","Could not save device settings; previous settings retained");return;}
  }
  bool rename=strcmp(preferences.name,candidate.name)!=0;
  preferences=candidate;
  if(rename){nameApplyPending=true;nameQueuedAt=millis();}
  String json="{\"saved\":true,\"reconnect\":"+String(rename?"true":"false")+",\"name\":"+jsonString(preferences.name)+",\"light\":"+String(light?"true":"false")+"}";
  server.sendHeader("Cache-Control","no-store");server.send(200,"application/json",json);
}
void serviceDeviceSettings(){
  if(nameApplyPending && (uint32_t)(millis()-nameQueuedAt)>=2000 && !otaBusy){
    nameApplyPending=false;apName=preferences.name;startHotspot();
  }
}
bool persistCalibration(const PredictionCalibration& candidate){
  PredictionCalibration previous;EEPROM.get(calibrationOffset(sensingMode),previous);
  EEPROM.put(calibrationOffset(sensingMode),candidate);
  if(!EEPROM.commit()){EEPROM.put(calibrationOffset(sensingMode),previous);return false;}
  calibration=candidate;
  memset(hist,0,sizeof(hist));rawState=stableState=ST_FREE;return true;
}
void handleCalibration(){
  String action=server.arg("action");
  if(action=="cancel"){
    calibrationSession.cancel();calibrationHandled=false;calibrationSaveError="";
  }else if(action=="clear"){
    PredictionCalibration empty={};
    if(!persistCalibration(empty)){server.send(500,"text/plain","Could not clear saved calibration");return;}
    calibrationSession.cancel();calibrationHandled=false;calibrationSaveError="";
  }else if(action=="step"){
    String step=server.arg("step"),mode=server.arg("mode");
    if(step.length()!=1||step[0]<'1'||step[0]>'3'||(mode!="1"&&mode!="2")){
      server.send(400,"text/plain","Valid calibration step and reference mode required");return;
    }
    if(!calibrationSession.beginStep(step[0]-'0',millis(),mode[0]-'0')){
      server.send(409,"text/plain","Finish the current step and follow Free, A, then B");return;
    }
    calibrationHandled=false;calibrationSaveError="";
  }else{server.send(400,"text/plain","Unknown calibration action");return;}
  server.send(200,"application/json","{\"saved\":true}");
}
void serviceCalibration(){
  calibrationSession.poll(millis());
  if(calibrationSession.ready()&&!calibrationHandled){
    calibrationHandled=true;PredictionCalibration candidate;
    if(calibrationSession.candidate(candidate)&&!persistCalibration(candidate))
      calibrationSaveError="Could not save calibration; previous profile retained. Restart wizard to retry";
  }
}
#include "sensing_runtime.h"
void showDiagnostics(){
  char rangeFields[240];rangeJson(rangeFields,sizeof(rangeFields),hookRanges);
  String json;json.reserve(1400);
  json="{\"firmware\":"+jsonString(FIRMWARE_VERSION)+",\"device_id\":"+jsonString(sboxID)+",\"device_name\":"+jsonString(preferences.name);
  json+=",\"sensing_mode\":"+String((unsigned)sensingMode)+",\"sensing_name\":"+jsonString(sensingModeName(sensingMode))+",\"sensing_revision\":"+String(sensingRevision);
  json+=",\"uptime_ms\":"+String(millis())+",\"sample_seq\":"+String(sampleSequence)+",\"sample_age_ms\":"+String(sampleSequence?(uint32_t)(millis()-sampleStamp):UINT32_MAX);
  json+=","+String(rangeFields);
  json+=",\"hook_raw_a\":"+String(hookA.valid?(int)hookA.mean:-1)+",\"hook_raw_b\":"+String(hookB.valid?(int)hookB.mean:-1);
  json+=",\"buckle_alarm_enabled\":"+String(buckleAlarmEnabled?"true":"false");
  json+=",\"wifi_mode\":"+String((unsigned)WiFi.getMode())+",\"wifi_channel\":"+String(WiFi.channel())+",\"hotspot_starts\":"+String(hotspotStartCount)+",\"router_attempts\":"+String(routerAttemptCount)+",\"auto_attempts_cancelled\":"+String(automaticAttemptCancelledCount);
  json+=",\"frame_ms\":"+String(frameDuration)+",\"heap\":"+String(ESP.getFreeHeap())+",\"max_free_block\":"+String(ESP.getMaxFreeBlockSize())+",\"heap_fragmentation\":"+String(ESP.getHeapFragmentation());
  json+=",\"reset_reason\":"+jsonString(ESP.getResetReason().c_str())+",\"wifi_status\":"+String(WiFi.status())+",\"rssi\":"+String(WiFi.RSSI());
  json+=",\"ap_clients\":"+String(WiFi.softAPgetStationNum())+",\"ap_ip\":"+jsonString(WiFi.softAPIP().toString().c_str())+",\"router_ip\":"+jsonString(WiFi.localIP().toString().c_str());
  json+=",\"hook_a_valid\":"+String(hookA.valid?"true":"false")+",\"hook_b_valid\":"+String(hookB.valid?"true":"false")+",\"a_timeouts\":"+String(hookA.timeouts)+",\"b_timeouts\":"+String(hookB.timeouts);
  json+=",\"mutual_valid\":"+String(mutualValid?"true":"false")+",\"prediction_calibrated\":"+String(validCalibration(calibration)?"true":"false")+",\"calibration_error\":"+jsonString(calibrationSaveError[0]?calibrationSaveError:calibrationSession.error())+"}";
  server.sendHeader("Cache-Control","no-store");server.send(200,"application/json",json);
}
