#pragma once
// Roll back both live settings and the shared EEPROM RAM buffer on a failed commit.
struct TuningSnapshot {
  bool guardFloat,emaOn,predictOn,buzzEnabled;
  uint16_t settleUs,gapMs,freqBuckle,freqHook,freqManual,mutShortMax,mutBridgeMax,baseA,baseB,hookDelta;
  uint8_t emaAlphaPct,patBuckle,patHook,patManual,buzzVol,gain;
  float emaA,emaB;
  uint8_t eeprom[96];
};
inline TuningSnapshot captureTuning(){
  TuningSnapshot s;
  s.guardFloat=guardFloat;
  s.emaOn=emaOn;
  s.predictOn=predictOn;
  s.buzzEnabled=buzzEnabled;
  s.settleUs=settleUs;
  s.gapMs=gapMs;
  s.freqBuckle=freqBuckle;
  s.freqHook=freqHook;
  s.freqManual=freqManual;
  s.mutShortMax=mutShortMax;
  s.mutBridgeMax=mutBridgeMax;
  s.baseA=baseA;
  s.baseB=baseB;
  s.hookDelta=hookDelta;
  s.emaAlphaPct=emaAlphaPct;
  s.patBuckle=patBuckle;
  s.patHook=patHook;
  s.patManual=patManual;
  s.buzzVol=buzzVol;
  s.gain=gain;
  s.emaA=emaA;
  s.emaB=emaB;
  for(unsigned i=0;i<96;i++)s.eeprom[i]=EEPROM.read(i);
  return s;
}
inline bool commitTuning(const TuningSnapshot& s){
  if(saveConfig())return true;
  guardFloat=s.guardFloat;
  emaOn=s.emaOn;
  predictOn=s.predictOn;
  buzzEnabled=s.buzzEnabled;
  settleUs=s.settleUs;
  gapMs=s.gapMs;
  freqBuckle=s.freqBuckle;
  freqHook=s.freqHook;
  freqManual=s.freqManual;
  mutShortMax=s.mutShortMax;
  mutBridgeMax=s.mutBridgeMax;
  baseA=s.baseA;
  baseB=s.baseB;
  hookDelta=s.hookDelta;
  emaAlphaPct=s.emaAlphaPct;
  patBuckle=s.patBuckle;
  patHook=s.patHook;
  patManual=s.patManual;
  buzzVol=s.buzzVol;
  gain=s.gain;
  emaA=s.emaA;
  emaB=s.emaB;
  for(unsigned i=0;i<96;i++)EEPROM.write(i,s.eeprom[i]);
  return false;
}
