#include <cassert>
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <vector>
#define INPUT 0
#define OUTPUT 1
#define HIGH 1
#define LOW 0
static int modes[16]={},latches[16]={};
static bool irq=true, measuring=false;
static int expectedMode=0,sensor=-1,lastHigh=-1, yields=0,disables=0,enables=0;
static uint32_t ticks=0,started=0;
static std::vector<int> order;
static std::vector<uint32_t> durations;
static char lastEvent=0;
void digitalWrite(int pin,int value){latches[pin]=value;if(value==HIGH)lastHigh=pin;lastEvent='w';}
void pinMode(int pin,int mode){
 if(mode==OUTPUT){
  assert(irq); // Charging never holds interrupts disabled.
  int other=pin==4?5:4;
  if(modes[other]==OUTPUT){ // Guard is established before the sensor drives HIGH.
    assert(latches[pin]==HIGH);
    assert(latches[other]==(expectedMode==0?HIGH:LOW));
  }
 }
 if(mode==INPUT && modes[pin]==OUTPUT && pin==sensor && !measuring){
  assert(irq==(expectedMode==0));
  if(expectedMode!=0)assert(lastEvent=='n');
  measuring=true;started=ticks;
 }
 modes[pin]=mode;lastEvent='p';
}
void delayMicroseconds(unsigned us){
 assert(us==50 && irq);sensor=lastHigh;int guard=sensor==4?5:4;
 assert(modes[sensor]==OUTPUT && latches[sensor]==HIGH);
 assert(modes[guard]==OUTPUT && latches[guard]==(expectedMode==0?HIGH:LOW));
 order.push_back(sensor);lastEvent='d';
}
void noInterrupts(){assert(irq);irq=false;disables++;lastEvent='n';}
void interrupts(){assert(!irq);irq=true;enables++;lastEvent='i';}
void yield(){assert(irq);assert(modes[4]==INPUT && modes[5]==INPUT);yields++;measuring=false;sensor=-1;lastEvent='y';}
struct FakeESP { uint32_t getCycleCount(){ticks+=100;return ticks;} } ESP;
uint32_t readMask(){
 assert(measuring);assert(irq==(expectedMode==0));
 int guard=sensor==4?5:4;
 assert(modes[sensor]==INPUT && modes[guard]==OUTPUT);
 assert(latches[guard]==(expectedMode==0?HIGH:LOW));
 uint32_t duration=durations.at(order.size()-1);
 return duration==UINT32_MAX || uint32_t(ticks-started)<duration+100 ? 1u<<sensor:0;
}
#define GPI readMask()
#include "../safety_harness_esp8266_v7/hook_sensing.h"
static void reset(int mode,uint32_t duration=200){
 assert(irq);modes[4]=modes[5]=INPUT;expectedMode=mode;sensor=lastHigh=-1;measuring=false;
 order.clear();durations.assign(32,duration);yields=disables=enables=0;ticks=0;lastEvent=0;
}
static void complete(HookFrameSampler& frame){
 for(int i=0;i<32;i++){
  int prior=yields;assert(frame.step()==(i==31));assert(yields==prior+1);
  assert(modes[4]==INPUT && modes[5]==INPUT && irq);
  int expected=expectedMode==2 ? (i%2==0?4:5) : (i<16?4:5);
  assert(order.back()==expected);
  if(i<15)assert(!frame.resultA().valid && !frame.resultB().valid);
 }
 assert(frame.step());assert(yields==32); // A finished frame must not collect more.
 assert(disables==(expectedMode==0?0:32));assert(enables==disables);
}
int main(){
 assert(validSensingMode(0)&&validSensingMode(1)&&validSensingMode(2));
 assert(!validSensingMode(3)&&!validSensingMode(255));
 assert(std::strcmp(sensingModeName(V6_HIGH),"v6-high")==0);
 assert(std::strcmp(sensingModeName(LOW_BATCH),"low-batch")==0);
 assert(std::strcmp(sensingModeName(LOW_ALTERNATING),"low-alternating")==0);
 for(int mode=0;mode<3;mode++){
  reset(mode);HookFrameSampler frame;frame.begin(4,5,SensingMode(mode));
  complete(frame);assert(frame.resultA().valid&&frame.resultB().valid);
  assert(frame.resultA().mean==200 && frame.resultA().med==200 && frame.resultA().p2p==0);
  reset(mode);frame.begin(4,5,SensingMode(mode));durations[0]=UINT32_MAX;
  durations[mode==2?2:1]=400;complete(frame);
  auto a=frame.resultA();assert(a.valid==(mode!=0));assert(a.timeouts==1);
  assert(a.mean==(14*200+400)/15 && a.med==a.mean && a.p2p==200);assert(frame.resultB().valid);
  reset(mode,UINT32_MAX);frame.begin(4,5,SensingMode(mode));
  durations[0]=300;durations[mode==2?1:16]=500;complete(frame);
  assert(frame.resultA().valid==(mode!=0)&&frame.resultB().valid==(mode!=0));
  assert(frame.resultA().timeouts==15&&frame.resultB().timeouts==15);
  assert(frame.resultA().mean==300&&frame.resultB().mean==500&&frame.resultA().p2p==0);
  reset(mode,UINT32_MAX);frame.begin(4,5,SensingMode(mode));complete(frame);
  assert(!frame.resultA().valid&&!frame.resultB().valid);
  assert(frame.resultA().timeouts==16&&frame.resultB().timeouts==16&&frame.resultA().mean==0);
  reset(mode);frame.begin(4,5,SensingMode(mode));ticks=UINT32_MAX-150;complete(frame);
  assert(frame.resultA().valid&&frame.resultA().mean==200);
  reset(mode);frame.begin(4,5,SensingMode(mode));assert(!frame.step());frame.abort();
  assert(modes[4]==INPUT&&modes[5]==INPUT&&irq);assert(frame.step());
  assert(!frame.resultA().valid&&!frame.resultB().valid&&frame.resultA().mean==0);
  reset(mode);frame.begin(4,5,SensingMode(mode));assert(!frame.step());
  reset(mode);frame.begin(4,5,SensingMode(mode));complete(frame);assert(frame.resultA().valid);
 }
 std::puts("v7 sensing tests passed");
}
