#pragma once
#include <stdint.h>
#include <limits.h>
// Limits retain v6 timing at 80 MHz. This engine collects one sample per step.
const uint32_t DISCHARGE_CEIL=800000, MUTUAL_CEIL=12000;
const int HOOK_SAMPLES=16, CHARGE_US=50, MUTUAL_SAMPLES=12;
struct CapStat { uint32_t med; uint32_t p2p; uint32_t mean; bool valid; uint8_t timeouts; };
enum SensingMode : uint8_t { V6_HIGH=0, LOW_BATCH=1, LOW_ALTERNATING=2 };
inline bool validSensingMode(uint8_t value){return value<=LOW_ALTERNATING;}
inline const char* sensingModeName(SensingMode mode){
  switch(mode){
    case V6_HIGH:return "v6-high";
    case LOW_BATCH:return "low-batch";
    case LOW_ALTERNATING:return "low-alternating";
    default:return "unknown";
  }
}
inline void driveHookHigh(int pin){ digitalWrite(pin,HIGH); pinMode(pin,OUTPUT); }
inline void releaseHooks(int a,int b){ pinMode(a,INPUT); pinMode(b,INPUT); }
class HookFrameSampler {
  struct Samples {
    uint32_t total=0,minimum=UINT32_MAX,maximum=0;
    uint8_t count=0,finite=0;
    void add(uint32_t cycles){
      count++;
      if(cycles>=DISCHARGE_CEIL)return;
      finite++;total+=cycles;
      if(cycles<minimum)minimum=cycles;
      if(cycles>maximum)maximum=cycles;
    }
    CapStat result(SensingMode mode) const {
      CapStat stat={0,0,0,false,(uint8_t)(count-finite)};
      if(finite){stat.med=stat.mean=total/finite;stat.p2p=maximum-minimum;}
      stat.valid=count==HOOK_SAMPLES && (mode==V6_HIGH?finite==HOOK_SAMPLES:finite>0);
      return stat;
    }
  } aSamples,bSamples;
  int a=0,b=0;
  uint8_t completed=0;
  SensingMode mode=V6_HIGH;
  bool active=false,pinsKnown=false;
public:
  void abort(){
    if(pinsKnown)releaseHooks(a,b);
    active=false;completed=0;aSamples=Samples();bSamples=Samples();
  }
  void begin(int aPin,int bPin,SensingMode selected){
    abort();a=aPin;b=bPin;pinsKnown=true;
    mode=validSensingMode((uint8_t)selected)?selected:V6_HIGH;
    releaseHooks(a,b);active=true;
  }
  bool step(){
    if(!active)return true;
    bool sampleA=mode==LOW_ALTERNATING ? completed%2==0 : completed<HOOK_SAMPLES;
    int sensor=sampleA?a:b,guard=sampleA?b:a;
    pinMode(sensor,INPUT);
    if(mode==V6_HIGH)driveHookHigh(guard);
    else {digitalWrite(guard,LOW);pinMode(guard,OUTPUT);}
    driveHookHigh(sensor);
    delayMicroseconds(CHARGE_US);
    // HIGH retains the v6 interrupt behavior. LOW masks only the discharge window.
    if(mode!=V6_HIGH)noInterrupts();
    pinMode(sensor,INPUT);
    uint32_t start=ESP.getCycleCount(),current=start;
    while((GPI&(1u<<sensor)) && (current-start<DISCHARGE_CEIL))current=ESP.getCycleCount();
    uint32_t cycles=current-start;
    if(mode!=V6_HIGH)interrupts();
    releaseHooks(sensor,guard);
    (sampleA?aSamples:bSamples).add(cycles);
    completed++;active=completed<2*HOOK_SAMPLES;
    yield();return !active;
  }
  CapStat resultA() const {return aSamples.result(mode);}
  CapStat resultB() const {return bSamples.result(mode);}
};

// Link measurement keeps the passive reset used by v6 in every mode.
// If the circuit cannot decay LOW, coupling is unknown, not an instant short.
uint32_t readMutualOnce(uint8_t dp, uint8_t sp, bool& valid){
  releaseHooks(dp,sp);
  uint32_t mask=(1u<<dp)|(1u<<sp);
  uint32_t start=ESP.getCycleCount();
  while(GPI&mask){
    if(ESP.getCycleCount()-start>=MUTUAL_CEIL){valid=false; return MUTUAL_CEIL;}
  }
  noInterrupts();
  driveHookHigh(dp);
  uint32_t t0=ESP.getCycleCount(),t=t0;
  while(!(GPI&(1u<<sp)) && (t-t0<MUTUAL_CEIL)) t=ESP.getCycleCount();
  interrupts();
  releaseHooks(dp,sp);
  valid=true;
  return t-t0;
}
uint32_t readMutual(uint8_t dp, uint8_t sp, bool& valid){
  valid=true;
  uint32_t s[MUTUAL_SAMPLES];
  for(int i=0;i<MUTUAL_SAMPLES;i++){
    bool sampleValid=false; s[i]=readMutualOnce(dp,sp,sampleValid);
    yield(); if(!sampleValid){valid=false; return MUTUAL_CEIL;}
    delayMicroseconds(400);
  }
  for(int i=1;i<MUTUAL_SAMPLES;i++){uint32_t k=s[i];int j=i-1;while(j>=0&&s[j]>k){s[j+1]=s[j];j--;}s[j+1]=k;}
  return (s[MUTUAL_SAMPLES/2-1]+s[MUTUAL_SAMPLES/2])/2;
}
