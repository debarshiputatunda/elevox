#include <cassert>
#include <cstdint>
bool guardFloat=0,emaOn=0,predictOn=0,buzzEnabled=0;
uint16_t settleUs=0,gapMs=0,freqBuckle=0,freqHook=0,freqManual=0,mutShortMax=0,mutBridgeMax=0,baseA=0,baseB=0,hookDelta=0;
uint8_t emaAlphaPct=0,patBuckle=0,patHook=0,patManual=0,buzzVol=0,gain=0;
float emaA=0,emaB=0;
struct FakeEEPROM {uint8_t bytes[1024]={};uint8_t read(unsigned i){return bytes[i];}void write(unsigned i,uint8_t value){bytes[i]=value;}} EEPROM;
bool persist=false;
bool saveConfig(){EEPROM.write(36,buzzEnabled);EEPROM.write(37,buzzVol);return persist;}
#include "../safety_harness_esp8266_v6/tuning_transaction.h"
int main(){
 buzzEnabled=true;buzzVol=80;EEPROM.write(36,1);EEPROM.write(37,80);EEPROM.write(256,42);
 auto previous=captureTuning();buzzEnabled=false;buzzVol=0;
 assert(!commitTuning(previous));assert(buzzEnabled&&buzzVol==80);
 assert(EEPROM.read(36)==1&&EEPROM.read(37)==80&&EEPROM.read(256)==42);
 persist=true;buzzVol=60;assert(commitTuning(previous));assert(buzzVol==60&&EEPROM.read(37)==60);
}
