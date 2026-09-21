#pragma once
void loadSensingCalibration(){
  EEPROM.get(calibrationOffset(sensingMode),calibration);
  if(!validCalibration(calibration))calibration=PredictionCalibration{};
}
bool hasSavedSensingMode(){SensingSettings saved;EEPROM.get(SENSING_SETTINGS_OFFSET,saved);return validSensingSettings(saved);}
void saveSensingSelection(){
  String raw=server.arg("mode");
  if(raw.length()!=1||raw[0]<'0'||raw[0]>'2'){
    server.send(400,"text/plain","Choose sensing mode 0, 1 or 2");return;
  }
  SensingMode requested=static_cast<SensingMode>(raw[0]-'0');
  if(calibrationSession.running()){
    server.send(409,"text/plain","Finish or cancel calibration before changing sensing mode");return;
  }
  // Also persist an explicitly saved default on a device with no mode record.
  if(requested!=sensingMode || !hasSavedSensingMode()){
    if(!saveSensingMode(EEPROM,(uint8_t)requested)){
      server.send(500,"text/plain","Sensing mode could not be saved; previous mode retained");return;
    }
  }
  if(requested!=sensingMode){
    hookSampler.abort();sensingFrameActive=false;sensingMode=requested;sensingRevision++;
    // Never blend old guard polarity or a half-acquired frame into the new mode.
    hookA=CapStat{};hookB=CapStat{};emaA=emaB=-1;dispA=dispB=0;
    sensingHasFrame=false;mutualStatus=MUTUAL_WAITING;
    mutualValid=false;mutualAB=MUTUAL_CEIL;linkIdx=loadA=loadB=0;bridged=false;hookViolation=false;
    hkA=hkB=0;histI=0;memset(hist,0,sizeof(hist));rawState=stableState=ST_FREE;
    calibrationSession.cancel();calibrationHandled=false;calibrationSaveError="";
    loadSensingCalibration();
  }
  server.sendHeader("Cache-Control","no-store");
  server.send(200,"application/json",String("{\"saved\":true,\"mode\":")+(unsigned)sensingMode+"}");
}
