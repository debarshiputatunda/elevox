#pragma once
#include <stdint.h>
#include <string.h>
static const unsigned HOOK_RANGES_OFFSET=1680;
struct HookRanges {uint32_t magic,revision;uint32_t bounds[2][4];uint32_t checksum;};
static_assert(HOOK_RANGES_OFFSET+sizeof(HookRanges)<=2048,"Range storage exceeds EEPROM");
inline bool validRangeBounds(const HookRanges& r){
 for(unsigned h=0;h<2;h++){
  const uint32_t* b=r.bounds[h];
  if(b[0]>b[1]||b[1]>=b[2]||b[2]>b[3]||b[3]>1000000)return false;
 }return true;
}
inline uint32_t rangesChecksum(const HookRanges& r){
 uint32_t hash=2166136261UL;
 const uint32_t words[]={r.magic,r.revision,r.bounds[0][0],r.bounds[0][1],r.bounds[0][2],r.bounds[0][3],r.bounds[1][0],r.bounds[1][1],r.bounds[1][2],r.bounds[1][3]};
 for(unsigned i=0;i<10;i++)for(unsigned j=0;j<4;j++)hash=(hash^((words[i]>>(j*8))&255))*16777619UL;
 return hash;
}
// v7.3 defaults fitted to SBOX-2026-9509, LOW_BATCH. Saved EEPROM ranges take precedence.
inline HookRanges defaultHookRanges(){
 HookRanges r={0x48524732UL,1,{{100,2230,3000,1000000},{100,2230,3000,1000000}},0};r.checksum=rangesChecksum(r);return r;
}
inline bool validHookRanges(const HookRanges& r){return r.magic==0x48524732UL&&r.revision&&validRangeBounds(r)&&r.checksum==rangesChecksum(r);}
template<class Storage>HookRanges loadHookRanges(Storage& storage){HookRanges r;storage.get(HOOK_RANGES_OFFSET,r);return validHookRanges(r)?r:defaultHookRanges();}
template<class Storage>bool saveHookRanges(Storage& storage,HookRanges& current,HookRanges next){
 if(!validRangeBounds(next))return false;
 if(memcmp(current.bounds,next.bounds,sizeof(current.bounds))==0)return true;
 next.magic=0x48524732UL;next.revision=current.revision+1;if(!next.revision)next.revision=1;next.checksum=rangesChecksum(next);
 HookRanges previous;storage.get(HOOK_RANGES_OFFSET,previous);storage.put(HOOK_RANGES_OFFSET,next);
 if(!storage.commit()){storage.put(HOOK_RANGES_OFFSET,previous);return false;}
 current=next;return true;
}
inline bool hookInsideRanges(int32_t raw,const uint32_t* b){return raw>=0&&(((uint32_t)raw>=b[0]&&(uint32_t)raw<=b[1])||((uint32_t)raw>=b[2]&&(uint32_t)raw<=b[3]));}
inline bool bothHooksInRanges(int32_t a,int32_t b,const HookRanges& r){return hookInsideRanges(a,r.bounds[0])&&hookInsideRanges(b,r.bounds[1]);}
