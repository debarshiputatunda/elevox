#include <cassert>
#include "../safety_harness_esp8266_v6/device_preferences.h"
int main(){
 auto p=makePreferences("Harness 01",true);assert(validPreferences(p));
 auto reload=p;assert(reload.light && strcmp(reload.name,"Harness 01")==0);
 reload.light=0;assert(!validPreferences(reload));
 assert(!validDeviceName(""));assert(!validDeviceName(" leading"));assert(!validDeviceName("bad/name"));
 assert(!validDeviceName("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg"));
 assert(validDeviceName("SBox-01_A"));
}
