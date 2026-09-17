#include <cassert>
#include <cstdint>
#include <climits>
#include <vector>
#define INPUT 0
#define OUTPUT 1
#define HIGH 1
#define LOW 0
static int modes[16]={},latches[16]={};
static unsigned ticks=0; static bool stuck=false, coupled=false, resetBlocked=false;
static bool sensingHighSeen=false,partial=false; static int sampleNo=0;
void pinMode(int pin,int mode){
  // Fail if any sensing transition would enable a LOW output latch.
  if(mode==OUTPUT)assert(latches[pin]==HIGH);
  modes[pin]=mode;
}
void digitalWrite(int pin,int value){assert(value==HIGH);latches[pin]=value;}
void delayMicroseconds(unsigned){}
void yield(){sampleNo++;}
void noInterrupts(){}
void interrupts(){}
struct FakeESP { unsigned getCycleCount(){return ++ticks;} } ESP;
unsigned readMask(){
 unsigned mask=0;
 for(int pin: {4,5}){
  if(modes[pin]==OUTPUT || stuck || (partial && sampleNo<15) || resetBlocked || (coupled && modes[pin==4?5:4]==OUTPUT))mask|=1u<<pin;
 }
 if((modes[4]==OUTPUT)!=(modes[5]==OUTPUT))sensingHighSeen=true;
 return mask;
}
#define GPI readMask()
#include "../safety_harness_esp8266_v6/high_guard_sensing.h"
int main(){
 auto a=readHook(5,4);auto b=readHook(4,5);
 assert(a.valid && b.valid && sensingHighSeen);
 assert(modes[4]==INPUT && modes[5]==INPUT);
 partial=true;sampleNo=0;auto incomplete=readHook(5,4);partial=false;
 assert(!incomplete.valid && incomplete.timeouts==15);
 stuck=true;auto saturated=readHook(5,4);stuck=false;
 assert(!saturated.valid && saturated.timeouts==HOOK_SAMPLES);
 assert(modes[4]==INPUT && modes[5]==INPUT);
 bool valid=false;coupled=true;
 auto linked=readMutual(5,4,valid);
 assert(valid && linked<MUTUAL_CEIL);
 assert(modes[4]==INPUT && modes[5]==INPUT);
 coupled=false;auto open=readMutual(5,4,valid);
 assert(valid && open==MUTUAL_CEIL);
 resetBlocked=true;readMutual(5,4,valid);
 assert(!valid); // A charged input must never masquerade as immediate coupling.
 assert(modes[4]==INPUT && modes[5]==INPUT);
}
