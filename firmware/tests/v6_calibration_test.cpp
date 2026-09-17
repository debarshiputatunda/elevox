#include <cassert>
#include <cstdint>
#include <cstring>
#include "../safety_harness_esp8266_v6/prediction_calibration.h"
using namespace prediction_calibration;
static void collect(CalibrationSession& s, uint32_t start, uint32_t a, uint32_t b,
                    bool noisy=false, unsigned invalid=0) {
  for(unsigned i=0;i<50;++i) {
    uint32_t jitter=noisy ? (i%2)*500 : i%3;
    s.observe(start+i*100,a+jitter,b+jitter,i>=invalid,i>=invalid);
  }
  s.poll(start+5000);
}
static PredictionCalibration learn(uint8_t mode, bool negative=false, uint32_t start=0) {
  CalibrationSession s; PredictionCalibration c={};
  assert(!s.candidate(c)); assert(!s.beginStep(2,start,mode));
  assert(s.beginStep(1,start,mode)); assert(s.remainingMs(start)==5000);
  collect(s,start,1000,2000); assert(s.completedSteps()==1 && !s.running());
  assert(!s.beginStep(3,start+5000,mode));
  assert(s.beginStep(2,start+6000,mode));
  collect(s,start+6000,negative?600:1400,2000); assert(s.completedSteps()==2);
  assert(!s.candidate(c));
  assert(s.beginStep(3,start+12000,mode));
  collect(s,start+12000,1000,negative?1400:2600);
  assert(s.ready() && s.candidate(c) && validCalibration(c));
  assert(c.directionA==(negative?-1:1)); assert(c.deltaA==400 && c.deltaB==600);
  assert(c.mode==mode); return c;
}
int main() {
  auto c=learn(1); learn(2); auto negative=learn(2,true); learn(1,false,UINT32_MAX-2000);
  assert(calibratedHook(c.baselineA,c.baselineA,c.deltaA,c.directionA)==BASELINE);
  assert(calibratedHook(c.referenceA,c.baselineA,c.deltaA,c.directionA)==REFERENCE);
  assert(calibratedHook(c.baselineA+200,c.baselineA,c.deltaA,c.directionA)==UNCERTAIN);
  assert(calibratedHook(100000,c.baselineA,c.deltaA,c.directionA)==UNCERTAIN);
  assert(calibratedHook(negative.referenceA,negative.baselineA,negative.deltaA,negative.directionA)==REFERENCE);
  auto corrupt=c; corrupt.baselineA++; assert(!validCalibration(corrupt));
  corrupt=c; corrupt.mode=3; corrupt.checksum=calibrationChecksum(corrupt); assert(!validCalibration(corrupt));
  corrupt=c; corrupt.deltaA++; corrupt.checksum=calibrationChecksum(corrupt); assert(!validCalibration(corrupt));
  CalibrationSession s; assert(!s.beginStep(1,0,0));
  assert(s.beginStep(1,0,1)); s.observe(0,1000,2000,true,true); s.poll(5000);
  assert(!s.ready() && s.error()[0]);
  assert(s.beginStep(1,0,1)); collect(s,0,1000,2000,false,11); assert(s.completedSteps()==0);
  assert(s.beginStep(1,0,1)); collect(s,0,1000,2000,false,10); assert(s.completedSteps()==1);
  assert(!s.beginStep(2,6000,2)); assert(s.beginStep(2,6000,1));
  collect(s,6000,1002,2000); assert(!s.ready() && s.error()[0]);
  assert(s.beginStep(1,0,1)); collect(s,0,1000,2000,true);
  assert(s.completedSteps()==1); assert(s.beginStep(2,6000,1));
  collect(s,6000,1400,2000,true); assert(!s.ready() && s.error()[0]);
  assert(s.beginStep(1,0,1)); s.poll(7501); assert(!s.running() && s.error()[0]);
  assert(s.beginStep(1,0,1)); s.cancel(); assert(!s.ready() && !s.running() && s.completedSteps()==0);
  assert(!s.candidate(c)); assert(validCalibration(c)); // Failed/canceled sessions never overwrite prior output.
  assert(s.beginStep(1,0,1)); for(unsigned i=0;i<50;++i)s.observe(i,1000,2000,true,true);
  s.poll(5000); assert(s.completedSteps()==0); // Bursts are not five seconds of evidence.
  assert(s.beginStep(1,0,1)); collect(s,0,800001,2000); assert(s.completedSteps()==0);
  assert(s.beginStep(1,0,1)); collect(s,0,1000,2000);
  assert(s.beginStep(2,6000,1)); collect(s,6000,1400,2000);
  assert(s.beginStep(3,12000,1)); collect(s,12000,1000,2001);
  PredictionCalibration previous=c;
  assert(!s.candidate(c) && std::memcmp(&previous,&c,sizeof(c))==0);
  assert(s.completedSteps()==2 && s.beginStep(3,18000,1));
  collect(s,18000,1000,2600); assert(s.candidate(c) && validCalibration(c));
  s.cancel(); assert(!s.candidate(c) && validCalibration(c));
  assert(calibratedHook(1000,1000,0,1)==UNCERTAIN);
  assert(calibratedHook(1000,1000,400,0)==UNCERTAIN);
  assert(s.beginStep(1,0,1));
  for(unsigned i=0;i<50;++i) s.observe(1000,1000,2000,true,true);
  s.observe(4900,1000,2000,true,true); s.poll(5000);
  assert(s.completedSteps()==0); // A repeated sample cannot satisfy the minimum.
  assert(s.beginStep(1,0,1)); assert(s.remainingMs(5000)==0);
  assert(!s.beginStep(2,1000,1)); // A running capture cannot skip ahead.
}
