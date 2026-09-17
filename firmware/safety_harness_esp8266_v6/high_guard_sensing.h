#pragma once
#include <stdint.h>
#include <limits.h>
// CPU-cycle limits retain v5 timing at 80 MHz.
const uint32_t DISCHARGE_CEIL=800000, MUTUAL_CEIL=12000;
const int HOOK_SAMPLES=16, CHARGE_US=50, MUTUAL_SAMPLES=12;
struct CapStat { uint32_t med; uint32_t p2p; uint32_t mean; bool valid; uint8_t timeouts; };
// V6: inactive hook actively HIGH; measured hook charges HIGH then becomes INPUT.
// Preload HIGH before enabling OUTPUT, including the first measurement after boot.
inline void driveHookHigh(int pin){ digitalWrite(pin,HIGH); pinMode(pin,OUTPUT); }
inline void releaseHooks(int a,int b){ pinMode(a,INPUT); pinMode(b,INPUT); }
// One bounded measurement per loop: no 16-sample batch blocks HTTP, alarms or Wi-Fi.
class HookSampler {
  int sensor=0,guard=0,count=0,validCount=0;
  uint32_t total=0,minimum=UINT32_MAX,maximum=0;
  bool active=false;
public:
  void begin(int sensorPin,int guardPin){
    sensor=sensorPin;guard=guardPin;count=validCount=0;total=maximum=0;minimum=UINT32_MAX;active=true;
  }
  bool step(){
    if(!active)return true;
    pinMode(sensor,INPUT);driveHookHigh(guard);driveHookHigh(sensor);
    delayMicroseconds(CHARGE_US);
    pinMode(sensor,INPUT);
    uint32_t start=ESP.getCycleCount(),current=start;
    while((GPI&(1u<<sensor)) && (current-start<DISCHARGE_CEIL))current=ESP.getCycleCount();
    uint32_t cycles=current-start;
    releaseHooks(sensor,guard);
    if(cycles<DISCHARGE_CEIL){total+=cycles;validCount++;if(cycles<minimum)minimum=cycles;if(cycles>maximum)maximum=cycles;}
    count++;active=count<HOOK_SAMPLES;yield();return !active;
  }
  CapStat result() const {
    CapStat result={0,0,0,false,(uint8_t)(count-validCount)};
    if(validCount){result.mean=result.med=total/(uint32_t)validCount;result.p2p=validCount>1?maximum-minimum:0;}
    result.valid=count==HOOK_SAMPLES && validCount==HOOK_SAMPLES;return result;
  }
};
// Synchronous wrapper retained for the native GPIO regression tests.
CapStat readHook(int sensorPin,int shieldPin,void (*service)()=nullptr){
  HookSampler sampler;sampler.begin(sensorPin,shieldPin);
  bool done=false;while(!done){done=sampler.step();if(service)service();}
  return sampler.result();
}

// Passive reset only: neither hook is ever driven LOW by v6 sensing.
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
