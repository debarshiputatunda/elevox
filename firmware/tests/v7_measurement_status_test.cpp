#include <cassert>
#include <cstdint>
#include <initializer_list>
#define INPUT 0
#define OUTPUT 1
#define HIGH 1
#define LOW 0
static int modes[16]={};static unsigned ticks=0,drivenAt=0;static bool resetBlocked=false,coupled=false,instant=false;
void pinMode(int pin,int mode){modes[pin]=mode;if(mode==OUTPUT)drivenAt=ticks;}
void digitalWrite(int,int){}void delayMicroseconds(unsigned){}void yield(){}void noInterrupts(){}void interrupts(){}
struct {unsigned getCycleCount(){return ++ticks;}} ESP;
unsigned readMask(){unsigned mask=0;for(int p:{4,5})if(resetBlocked||modes[p]==OUTPUT||(coupled&&modes[p==4?5:4]==OUTPUT&&(instant||ticks-drivenAt>25)))mask|=1u<<p;return mask;}
#define GPI readMask()
#include "../safety_harness_esp8266_v7/hook_sensing.h"
int main(){
 CapStat partial={250,20,250,false,1};assert(observedHookMean(partial,true,16)==250);assert(!partial.valid);
 assert(observedHookMean(partial,false,16)==-1);partial.timeouts=16;assert(observedHookMean(partial,true,16)==-1);
 bool valid;coupled=true;auto timing=readMutual(4,5,valid);assert(valid&&timing>0&&timing<MUTUAL_CEIL&&mutualStatus==MUTUAL_OK);
 coupled=false;readMutual(4,5,valid);assert(!valid&&mutualStatus==MUTUAL_RISE_TIMEOUT);
 resetBlocked=true;readMutual(4,5,valid);assert(!valid&&mutualStatus==MUTUAL_RESET_TIMEOUT);
 resetBlocked=false;coupled=true;instant=true;auto unresolved=readMutual(4,5,valid);assert(!valid&&unresolved==0&&mutualStatus==MUTUAL_BELOW_RESOLUTION);
 assert(modes[4]==INPUT&&modes[5]==INPUT);
}
