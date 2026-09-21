#include <initializer_list>

#include <cassert>
#include <cstring>
#include "../safety_harness_esp8266_v7/hook_ranges.h"
struct Storage {uint8_t ram[2048]={},flash[2048]={};bool fail=false;template<class T>void get(unsigned o,T& v){memcpy(&v,ram+o,sizeof(v));}template<class T>void put(unsigned o,const T& v){memcpy(ram+o,&v,sizeof(v));}bool commit(){if(fail)return false;memcpy(flash,ram,2048);return true;}void reboot(){memcpy(ram,flash,2048);}};
int main(){
 Storage s;auto r=loadHookRanges(s);assert(validHookRanges(r));
 for(int v: {10,1800,10000,1000000})assert(bothHooksInRanges(v,500,r));
 for(int v: {-1,0,9,1801,9999,1000001}){assert(!bothHooksInRanges(v,500,r));assert(!bothHooksInRanges(500,v,r));}
 assert(bothHooksInRanges(500,20000,r));
 auto n=r;n.bounds[0][0]=20;s.ram[1664]=42;assert(saveHookRanges(s,r,n));assert(r.revision==2);s.reboot();assert(loadHookRanges(s).bounds[0][0]==20&&s.ram[1664]==42);
 n=r;n.bounds[0][1]=n.bounds[0][2];assert(!saveHookRanges(s,r,n));
 n=r;n.bounds[1][0]=30;s.fail=true;assert(!saveHookRanges(s,r,n));assert(r.bounds[1][0]==10);s.fail=false;s.commit();s.reboot();assert(loadHookRanges(s).bounds[1][0]==10);
 s.ram[HOOK_RANGES_OFFSET]=0;assert(loadHookRanges(s).bounds[0][0]==10);
}
