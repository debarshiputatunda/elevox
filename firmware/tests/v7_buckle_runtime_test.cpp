#include <cassert>
#include <cstring>
#include <string>
#include "../safety_harness_esp8266_v7/buckle_alarm_settings.h"
using String=std::string;
struct {String value,body;int status=0;String arg(const char*){return value;}
 void send(int s,const char*,String text){status=s;body=text;}
 void sendHeader(const char*,const char*){}
} server;
struct {uint8_t ram[2048]={};bool fail=false;int commits=0;
 template<class T>void get(unsigned o,T& x){memcpy(&x,ram+o,sizeof(x));}
 template<class T>void put(unsigned o,const T& x){memcpy(ram+o,&x,sizeof(x));}
 bool commit(){commits++;return !fail;}
} EEPROM;
bool buckleAlarmEnabled=true;
#include "../safety_harness_esp8266_v7/buckle_alarm_runtime.h"
int main(){
 for(const char* bad:{"","true","false","-1","2","0extra"," 1"}){server.value=bad;setBuckleAlarm();assert(server.status==400&&buckleAlarmEnabled&&EEPROM.commits==0);}
 server.value="0";EEPROM.fail=true;setBuckleAlarm();assert(server.status==500&&buckleAlarmEnabled&&loadBuckleAlarm(EEPROM));
 EEPROM.fail=false;setBuckleAlarm();assert(server.status==200&&!buckleAlarmEnabled&&!loadBuckleAlarm(EEPROM));assert(server.body=="{\"saved\":true,\"enabled\":false}");
 int commits=EEPROM.commits;setBuckleAlarm();assert(EEPROM.commits==commits);
 server.value="1";setBuckleAlarm();assert(server.status==200&&buckleAlarmEnabled&&loadBuckleAlarm(EEPROM));
}
