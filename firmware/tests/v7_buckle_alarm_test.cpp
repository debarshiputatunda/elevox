#include <cassert>
#include <cstring>
#include <stdint.h>
#include "../safety_harness_esp8266_v7/buckle_alarm_settings.h"
#include "../safety_harness_esp8266_v7/alarm_logic.h"
struct Storage {
 uint8_t ram[2048]={},flash[2048]={};bool fail=false;
 template<class T>void get(unsigned o,T& v){memcpy(&v,ram+o,sizeof(v));}
 template<class T>void put(unsigned o,const T& v){memcpy(ram+o,&v,sizeof(v));}
 bool commit(){if(fail)return false;memcpy(flash,ram,sizeof(ram));return true;}
 void reboot(){memcpy(ram,flash,sizeof(ram));}
};
int main(){
 Storage e;assert(loadBuckleAlarm(e)); // No saved setting: alarms on.
 memset(e.ram,255,sizeof(e.ram));assert(loadBuckleAlarm(e));
 e.ram[44]=72;e.ram[256]=36;e.ram[1536]=49;
 assert(saveBuckleAlarm(e,false));e.reboot();assert(!loadBuckleAlarm(e));
 assert(e.ram[44]==72&&e.ram[256]==36&&e.ram[1536]==49);
 e.fail=true;assert(!saveBuckleAlarm(e,true));assert(!loadBuckleAlarm(e));
 e.fail=false;assert(e.commit());e.reboot();assert(!loadBuckleAlarm(e));
 assert(saveBuckleAlarm(e,true));e.reboot();assert(loadBuckleAlarm(e));
 assert(saveBuckleAlarm(e,false));e.ram[BUCKLE_ALARM_OFFSET+4]=9;assert(loadBuckleAlarm(e));
 assert(selectAlarmMode(true,true,true,false,false)==ALARM_BUCKLE);
 assert(selectAlarmMode(true,false,true,false,false)==ALARM_NONE);
 assert(selectAlarmMode(true,false,true,true,false)==ALARM_HOOK);
 assert(selectAlarmMode(true,false,true,false,true)==ALARM_MANUAL);
 assert(selectAlarmMode(true,false,false,false,false)==ALARM_SENSOR);
 assert(selectAlarmMode(true,true,false,true,true)==ALARM_BUCKLE);
 assert(selectAlarmMode(false,true,true,false,false)==ALARM_NONE);
 // Re-enabling with an already-open buckle must immediately restore its alarm.
 assert(selectAlarmMode(true,true,true,false,false)==ALARM_BUCKLE);
}
