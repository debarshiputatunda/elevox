#pragma once
#include <stdint.h>
#include <math.h>

// Optional prediction-only calibration. This module neither reads nor changes
// alarm thresholds. REFERENCE means similar to the user's recorded contact;
// it does not establish fastening, material identity, or body attachment.
namespace prediction_calibration {
static const uint32_t kMagic = 0x5043414cUL;
static const uint16_t kVersion = 1;
static const uint32_t kMaxRaw = 800000;
static const uint32_t kDurationMs = 5000;
struct PredictionCalibration {
  uint32_t magic;
  uint16_t version;
  uint8_t mode; // 1 = hand reference, 2 = metal reference
  uint8_t reserved;
  uint32_t baselineA, baselineB;
  uint32_t referenceA, referenceB;
  uint32_t deltaA, deltaB;
  uint32_t noiseA, noiseB; // Ceiling of baseline sample standard deviation.
  int8_t directionA, directionB;
  uint8_t reserved2[2];
  uint32_t checksum;
};
static_assert(sizeof(PredictionCalibration)==48,"Calibration record layout changed");

// FNV-1a over explicit little-endian fields, independent of host padding/endian.
inline void checksumWord(uint32_t& hash, uint32_t word, unsigned bytes) {
  for(unsigned i=0;i<bytes;++i) { hash ^= (word >> (8*i)) & 255; hash *= 16777619UL; }
}
inline uint32_t calibrationChecksum(const PredictionCalibration& c) {
  uint32_t h=2166136261UL;
  checksumWord(h,c.magic,4); checksumWord(h,c.version,2);
  checksumWord(h,c.mode,1); checksumWord(h,c.reserved,1);
  checksumWord(h,c.baselineA,4); checksumWord(h,c.baselineB,4);
  checksumWord(h,c.referenceA,4); checksumWord(h,c.referenceB,4);
  checksumWord(h,c.deltaA,4); checksumWord(h,c.deltaB,4);
  checksumWord(h,c.noiseA,4); checksumWord(h,c.noiseB,4);
  checksumWord(h,static_cast<uint8_t>(c.directionA),1);
  checksumWord(h,static_cast<uint8_t>(c.directionB),1);
  checksumWord(h,c.reserved2[0],1); checksumWord(h,c.reserved2[1],1);
  return h;
}
inline bool validChannel(uint32_t baseline,uint32_t reference,uint32_t delta,
                         uint32_t noise,int8_t direction) {
  if(baseline>kMaxRaw || reference>kMaxRaw || noise>kMaxRaw ||
     (direction!=1 && direction!=-1)) return false;
  int64_t signedDelta=static_cast<int64_t>(reference)-baseline;
  return signedDelta==static_cast<int64_t>(direction)*delta &&
         delta>=20 && delta>=6ULL*noise;
}
inline bool validCalibration(const PredictionCalibration& c) {
  return c.magic==kMagic && c.version==kVersion && (c.mode==1 || c.mode==2) &&
    c.reserved==0 && c.reserved2[0]==0 && c.reserved2[1]==0 &&
    validChannel(c.baselineA,c.referenceA,c.deltaA,c.noiseA,c.directionA) &&
    validChannel(c.baselineB,c.referenceB,c.deltaB,c.noiseB,c.directionB) &&
    c.checksum==calibrationChecksum(c);
}
enum HookMatch { UNCERTAIN=0, BASELINE=1, REFERENCE=2 };
inline HookMatch calibratedHook(uint32_t raw,uint32_t baseline,uint32_t delta,int8_t direction) {
  if(raw>kMaxRaw || baseline>kMaxRaw || delta<20 || delta>kMaxRaw ||
     (direction!=1 && direction!=-1)) return UNCERTAIN;
  const int64_t offset=(static_cast<int64_t>(raw)-baseline)*direction;
  const int64_t tolerance=delta/4;
  if(offset>=-tolerance && offset<=tolerance) return BASELINE;
  if(offset>=static_cast<int64_t>(delta)-tolerance &&
     offset<=static_cast<int64_t>(delta)+tolerance) return REFERENCE;
  return UNCERTAIN;
}

class CalibrationSession {
  struct Stats {
    uint32_t count, firstMs, lastMs;
    double mean,m2;
    Stats():count(0),firstMs(0),lastMs(0),mean(0),m2(0) {}
    void add(uint32_t value,uint32_t elapsed) {
      if(!count) firstMs=elapsed;
      lastMs=elapsed; ++count;
      const double d=value-mean; mean+=d/count; m2+=d*(value-mean);
    }
    double deviation() const { return count>1?sqrt(m2/(count-1)):0; }
    uint32_t rounded() const { return static_cast<uint32_t>(mean+0.5); }
    bool enough(uint32_t total) const {
      return count>=10 && static_cast<uint64_t>(count)*5>=static_cast<uint64_t>(total)*4 &&
             firstMs<=1000 && lastMs>=4000;
    }
  };
  PredictionCalibration pending_;
  Stats a_,b_;
  uint32_t started_,total_,lastObserved_;
  uint8_t step_,completed_,mode_;
  bool running_,ready_,observed_;
  const char* error_;
  void fail(const char* message) { running_=false; ready_=false; error_=message; }
  bool reference(const Stats& stats,uint32_t baseline,uint32_t noise,
                 uint32_t& ref,uint32_t& delta,int8_t& direction) {
    ref=stats.rounded(); direction=ref>=baseline?1:-1;
    delta=ref>=baseline?ref-baseline:baseline-ref;
    // Six baseline/contact standard deviations plus an absolute raw-count floor.
    if(delta<20 || delta<6.0*noise || delta<6.0*stats.deviation()) return false;
    return true;
  }
  void finish() {
    running_=false;
    if((step_!=3 && !a_.enough(total_)) || (step_!=2 && !b_.enough(total_))) {
      fail("Too few valid samples across five seconds; retry this step"); return;
    }
    if(step_==1) {
      pending_.baselineA=a_.rounded(); pending_.baselineB=b_.rounded();
      pending_.noiseA=static_cast<uint32_t>(ceil(a_.deviation()));
      pending_.noiseB=static_cast<uint32_t>(ceil(b_.deviation()));
    } else if(step_==2) {
      if(!reference(a_,pending_.baselineA,pending_.noiseA,pending_.referenceA,
                    pending_.deltaA,pending_.directionA)) {
        fail("Hook A reference too close to baseline or too noisy; retry"); return;
      }
    } else {
      if(!reference(b_,pending_.baselineB,pending_.noiseB,pending_.referenceB,
                    pending_.deltaB,pending_.directionB)) {
        fail("Hook B reference too close to baseline or too noisy; retry"); return;
      }
      pending_.checksum=calibrationChecksum(pending_);
      if(!validCalibration(pending_)) { fail("Invalid calibration; restart"); return; }
      ready_=true;
    }
    completed_=step_; error_="";
  }
public:
  CalibrationSession() { cancel(); }
  void cancel() {
    pending_=PredictionCalibration(); a_=Stats(); b_=Stats();
    started_=total_=lastObserved_=0; step_=completed_=mode_=0;
    running_=ready_=observed_=false; error_="";
  }
  // Step 1 deliberately restarts. A failed step 2/3 may be retried without
  // replacing prior successful steps. A caller owns/persists the active record.
  bool beginStep(uint8_t step,uint32_t now,uint8_t mode) {
    if((mode!=1 && mode!=2) || step<1 || step>3) return false;
    if(step!=1 && (running_ || ready_ || step!=completed_+1 || mode!=mode_)) return false;
    if(step==1) { cancel(); mode_=mode; pending_.magic=kMagic;
      pending_.version=kVersion; pending_.mode=mode; }
    step_=step; started_=now; total_=0; observed_=false; a_=Stats(); b_=Stats();
    running_=true; ready_=false; error_=""; return true;
  }
  // Call once per freshly acquired sample, including invalid samples. Duplicate
  // timestamps are ignored. Call poll from the main loop even without samples.
  void observe(uint32_t now,uint32_t rawA,uint32_t rawB,bool validA,bool validB) {
    poll(now); if(!running_) return;
    if(observed_ && now==lastObserved_) return;
    observed_=true; lastObserved_=now; ++total_;
    const uint32_t elapsed=now-started_;
    if(validA && rawA<=kMaxRaw) a_.add(rawA,elapsed);
    if(validB && rawB<=kMaxRaw) b_.add(rawB,elapsed);
  }
  void poll(uint32_t now) {
    if(!running_) return;
    const uint32_t elapsed=now-started_; // uint32 wrap-safe for bounded step.
    if(elapsed>7500) { fail("Calibration step timed out; retry"); return; }
    if(elapsed>=kDurationMs) finish();
  }
  uint8_t mode() const { return mode_; }
  uint8_t step() const { return step_; }
  uint8_t completedSteps() const { return completed_; }
  bool running() const { return running_; }
  bool ready() const { return ready_; }
  const char* error() const { return error_; }
  uint32_t remainingMs(uint32_t now) const {
    uint32_t elapsed=now-started_;
    return running_ && elapsed<kDurationMs?kDurationMs-elapsed:0;
  }
  bool candidate(PredictionCalibration& out) const {
    if(!ready_) return false;
    out=pending_; return true;
  }
};
} // namespace prediction_calibration
