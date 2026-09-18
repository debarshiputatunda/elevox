#pragma once
#include <stdint.h>
// Preserve all v6 alarm, network, device-preference and HIGH calibration bytes.
static const unsigned SENSING_SETTINGS_OFFSET=1216;
struct SensingSettings { uint32_t magic;uint8_t mode,reserved[3];uint32_t checksum; };
static_assert(sizeof(SensingSettings)==12,"Unexpected sensing record layout");
inline uint32_t sensingChecksum(const SensingSettings& s){
 uint32_t h=2166136261UL;
 for(unsigned i=0;i<4;i++)h=(h^((s.magic>>(8*i))&255))*16777619UL;
 h=(h^s.mode)*16777619UL;
 for(unsigned i=0;i<3;i++)h=(h^s.reserved[i])*16777619UL;
 return h;
}
inline SensingSettings makeSensingSettings(uint8_t mode){
 SensingSettings s={0x53454e37UL,mode,{0,0,0},0};s.checksum=sensingChecksum(s);return s;
}
inline bool validSensingSettings(const SensingSettings& s){
 return s.magic==0x53454e37UL&&s.mode<=2&&!s.reserved[0]&&!s.reserved[1]&&!s.reserved[2]&&s.checksum==sensingChecksum(s);
}
template<class Storage> uint8_t loadSensingMode(Storage& storage){
 SensingSettings s;storage.get(SENSING_SETTINGS_OFFSET,s);return validSensingSettings(s)?s.mode:1;
}
template<class Storage> bool saveSensingMode(Storage& storage,uint8_t mode){
 if(mode>2)return false;
 SensingSettings previous;storage.get(SENSING_SETTINGS_OFFSET,previous);
 SensingSettings next=makeSensingSettings(mode);
 storage.put(SENSING_SETTINGS_OFFSET,next);
 if(storage.commit())return true;
 storage.put(SENSING_SETTINGS_OFFSET,previous);return false;
}
inline unsigned calibrationOffset(uint8_t mode){return mode==0?1152:mode==1?1280:1344;}
static_assert(1344+48<=2048,"Calibration exceeds EEPROM allocation");
