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
CapStat readHook(int sensorPin, int shieldPin){
  pinMode(sensorPin, INPUT);
  driveHookHigh(shieldPin);

  uint32_t totalCycles = 0;
  int validReadings = 0;
  uint32_t vmin = UINT32_MAX, vmax = 0;

  for(int i = 0; i < HOOK_SAMPLES; i++){
    driveHookHigh(sensorPin);
    delayMicroseconds(CHARGE_US);

    noInterrupts();
    pinMode(sensorPin, INPUT);
    uint32_t start = ESP.getCycleCount();
    uint32_t current = start;
    while((GPI & (1 << sensorPin)) != 0 && (current - start < DISCHARGE_CEIL)){
      current = ESP.getCycleCount();
    }
    interrupts();

    uint32_t cycleDiff = current - start;
    if(cycleDiff < DISCHARGE_CEIL){
      totalCycles += cycleDiff;
      validReadings++;
      if(cycleDiff < vmin) vmin = cycleDiff;
      if(cycleDiff > vmax) vmax = cycleDiff;
    }
    yield();
  }

  releaseHooks(sensorPin,shieldPin);
  CapStat r = {0, 0, 0, false, (uint8_t)(HOOK_SAMPLES-validReadings)};
  if(validReadings > 0){
    r.valid = (validReadings == HOOK_SAMPLES); // Partial batches cannot represent a complete reading.
    r.mean = totalCycles / (uint32_t)validReadings;
    r.med  = r.mean; // old path uses mean as the reported value
    r.p2p  = (validReadings >= 2) ? (vmax - vmin) : 0;
  }
  return r;
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
