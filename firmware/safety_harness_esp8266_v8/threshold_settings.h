#pragma once
#include <stdint.h>
struct ThresholdState {
  uint32_t a=0,b=0,revision=0,baseA=0,baseB=0;
  uint8_t enabled=0,pending=0,baseValid=0;
};
inline bool updateThresholds(ThresholdState& s,uint32_t a,uint32_t b,uint32_t expected,bool local){
  if(expected!=s.revision || a>100000 || b>100000)return false;
  bool changed=a!=s.a||b!=s.b||!s.enabled;
  if(changed){s.revision++;if(!s.revision)s.revision=1;}
  s.a=a;s.b=b;s.enabled=true;
  if(local){if(changed)s.pending=true;}
  else{s.baseA=a;s.baseB=b;s.baseValid=true;s.pending=false;}
  return true;
}
inline uint32_t thresholdChecksum(const ThresholdState& s){
  return 0x54485236U ^ s.a ^ (s.b<<1) ^ s.revision ^ (s.baseA<<2) ^ (s.baseB<<3) ^
    (s.enabled?1U:0U) ^ (s.pending?2U:0U) ^ (s.baseValid?4U:0U);
}
static_assert(sizeof(ThresholdState)<=24,"Threshold metadata overlaps EEPROM");
