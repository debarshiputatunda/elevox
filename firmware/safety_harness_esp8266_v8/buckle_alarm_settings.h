#pragma once
#include <stdint.h>
static const unsigned BUCKLE_ALARM_OFFSET=1664;
struct BuckleAlarmSettings {uint32_t magic;uint8_t enabled,reserved[3];uint32_t checksum;};
static_assert(sizeof(BuckleAlarmSettings)==12,"Buckle alarm record layout changed");
static_assert(BUCKLE_ALARM_OFFSET+sizeof(BuckleAlarmSettings)<=2048,"Buckle setting exceeds EEPROM");
inline uint32_t buckleChecksum(const BuckleAlarmSettings& s){
 uint32_t h=2166136261UL;
 for(unsigned i=0;i<4;i++)h=(h^((s.magic>>(8*i))&255))*16777619UL;
 h=(h^s.enabled)*16777619UL;
 for(unsigned i=0;i<3;i++)h=(h^s.reserved[i])*16777619UL;
 return h;
}
inline BuckleAlarmSettings makeBuckleAlarm(bool enabled){
 BuckleAlarmSettings s={0x42414c31UL,(uint8_t)enabled,{0,0,0},0};s.checksum=buckleChecksum(s);return s;
}
inline bool validBuckleAlarm(const BuckleAlarmSettings& s){
 return s.magic==0x42414c31UL&&s.enabled<=1&&!s.reserved[0]&&!s.reserved[1]&&!s.reserved[2]&&s.checksum==buckleChecksum(s);
}
template<class Storage>bool loadBuckleAlarm(Storage& storage){
 BuckleAlarmSettings s;storage.get(BUCKLE_ALARM_OFFSET,s);return validBuckleAlarm(s)?s.enabled:true;
}
template<class Storage>bool saveBuckleAlarm(Storage& storage,bool enabled){
 BuckleAlarmSettings previous;storage.get(BUCKLE_ALARM_OFFSET,previous);
 if(validBuckleAlarm(previous)&&previous.enabled==enabled)return true;
 storage.put(BUCKLE_ALARM_OFFSET,makeBuckleAlarm(enabled));
 if(storage.commit())return true;
 storage.put(BUCKLE_ALARM_OFFSET,previous);return false;
}
