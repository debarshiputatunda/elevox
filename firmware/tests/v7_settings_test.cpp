#include <cassert>
#include <cstring>
#include <stdint.h>
#include "../safety_harness_esp8266_v7/sensing_settings.h"
struct Storage {
 unsigned char ram[2048]={},flash[2048]={};bool fail=false;
 template<class T> void get(unsigned offset,T& out){memcpy(&out,ram+offset,sizeof(out));}
 template<class T> void put(unsigned offset,const T& in){memcpy(ram+offset,&in,sizeof(in));}
 bool commit(){if(fail)return false;memcpy(flash,ram,sizeof(ram));return true;}
 void reboot(){memcpy(ram,flash,sizeof(ram));}
};
int main(){
 Storage e;assert(loadSensingMode(e)==1);
 assert(calibrationOffset(0)==1152);assert(calibrationOffset(1)!=1280&&calibrationOffset(2)!=1344);assert(calibrationOffset(1)!=calibrationOffset(2));
 assert(calibrationOffset(1)>SENSING_SETTINGS_OFFSET+sizeof(SensingSettings));
 assert(calibrationOffset(2)+48<=2048);
 e.ram[44]=73;e.ram[256]=91;e.ram[1024]=82;e.ram[1152]=55;
 assert(saveSensingMode(e,2));e.reboot();assert(loadSensingMode(e)==2);
 assert(e.ram[44]==73&&e.ram[256]==91&&e.ram[1024]==82&&e.ram[1152]==55);
 e.fail=true;assert(!saveSensingMode(e,0));assert(loadSensingMode(e)==2);
 e.fail=false;e.commit();e.reboot();assert(loadSensingMode(e)==2);
 assert(!saveSensingMode(e,3));assert(loadSensingMode(e)==2);
 for(unsigned mode=0;mode<3;mode++){assert(saveSensingMode(e,mode));e.reboot();assert(loadSensingMode(e)==mode);}
 e.ram[SENSING_SETTINGS_OFFSET+4]=9;assert(loadSensingMode(e)==1);
 auto s=makeSensingSettings(0);assert(validSensingSettings(s));s.checksum++;assert(!validSensingSettings(s));
}
