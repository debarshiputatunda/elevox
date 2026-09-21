#include <cassert>
#include <cstring>
#include <string>
#include <map>
#include <cstdio>
#include "../safety_harness_esp8266_v7/hook_ranges.h"
using String=std::string;
struct {std::map<String,String> args;String body;int status=0;String arg(const char* key){return args[key];}void send(int s,const char*,String b){status=s;body=b;}void sendHeader(const char*,const char*){}} server;
struct {uint8_t ram[2048]={};bool fail=false;int commits=0;template<class T>void get(unsigned o,T& x){memcpy(&x,ram+o,sizeof(x));}template<class T>void put(unsigned o,const T& x){memcpy(ram+o,&x,sizeof(x));}bool commit(){commits++;return !fail;}} EEPROM;
HookRanges hookRanges=defaultHookRanges();struct Sample{bool valid;uint32_t mean;};Sample hookA={true,500},hookB={true,20000};bool hookViolation=false;
#include "../safety_harness_esp8266_v7/hook_ranges_runtime.h"
int main(){
 server.args={{"a0_min","10"},{"a0_max","1800"},{"a1_min","10000"},{"a1_max","1000000"},{"b0_min","10"},{"b0_max","1800"},{"b1_min","10000"},{"b1_max","1000000"},{"expected_revision","1"}};
 saveHookRangeRequest();assert(server.status==200&&hookViolation);
 server.args["a0_min"]="20";EEPROM.fail=true;saveHookRangeRequest();assert(server.status==500&&hookRanges.revision==1);
 EEPROM.fail=false;saveHookRangeRequest();assert(server.status==200&&hookRanges.revision==2);assert(server.body.find("\"hook_ranges_revision\":2")!=String::npos);
 saveHookRangeRequest();assert(server.status==409);
 server.args["expected_revision"]="2";
 for(const char* bad:{"-1","1.5","1000001","42949672960",""," 10"}){server.args["a0_min"]=bad;saveHookRangeRequest();assert(server.status==400);}
 server.args["a0_min"]="20";server.args["a0_max"]="10000";saveHookRangeRequest();assert(server.status==400);
 server.args["a0_max"]="1800";hookB.mean=5000;saveHookRangeRequest();assert(server.status==200&&!hookViolation);
}
