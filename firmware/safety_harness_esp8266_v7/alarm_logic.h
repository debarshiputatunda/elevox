#pragma once
#include <stdint.h>
inline bool hooksExceeded(int32_t a, int32_t b, uint32_t limitA, uint32_t limitB, bool enabled){
  return enabled && a>=0 && b>=0 && (uint32_t)a>=limitA && (uint32_t)b>=limitB;
}
inline bool pulseExpired(uint32_t now, uint32_t started){
  return (uint32_t)(now-started)>=10000U;
}
inline float smoothHook(float previous, int32_t raw, uint8_t alphaPercent){
  if(raw<0) return -1.0f;
  if(previous<0) return (float)raw;
  float alpha=alphaPercent/100.0f;
  return alpha*(float)raw+(1.0f-alpha)*previous;
}

enum AlarmMode { ALARM_NONE, ALARM_MANUAL, ALARM_HOOK, ALARM_BUCKLE, ALARM_SENSOR };
inline AlarmMode selectAlarmMode(bool buckleOpen,bool buckleEnabled,bool hooksValid,bool hookViolation,bool manual){
 return buckleEnabled&&buckleOpen?ALARM_BUCKLE:!hooksValid?ALARM_SENSOR:hookViolation?ALARM_HOOK:manual?ALARM_MANUAL:ALARM_NONE;
}
