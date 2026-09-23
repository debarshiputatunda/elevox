#pragma once
#include <stdint.h>

// Hook case classifier, v7.3.1.
// Thresholds are fitted to ONE prototype box (SBOX-2026-9509) in LOW_BATCH
// sensing mode, from 21-22 Sep 2026 captures. Inputs are the smoothed hook
// readings the dashboard records (raw1/raw2). Other boxes, other sensing
// modes and untested anchors (large structures, painted, wet) are not covered.
// Electrical classification only: it does not prove mechanical fastening.
//
// v7.3.1: "body" is no longer an absolute level. A 42 min both-free run drifted
// from 1838/1807 down to ~1760/1695, straight through the old 1760 body line.
// Body is now "both hooks at least bodyDrop below a learned free baseline".

enum HookCase : uint8_t {
  CASE_DETECTING    = 0,
  CASE_SHARED_METAL = 1,  // both hooks read ~0: hooks bridged by one conductor
  CASE_A_METAL      = 2,
  CASE_B_METAL      = 3,
  CASE_UNRECOGNISED = 4,  // both hooks in the metal band, no clear winner (untested)
  CASE_BOTH_FREE    = 5,
  CASE_BODY         = 6,
  CASE_A_HAND       = 7,
  CASE_B_HAND       = 8,
  CASE_BOTH_HANDS   = 9,
  CASE_SENSOR_FAULT = 10
};

struct HookCaseLimits {
  int32_t shortMax;    // max(A,B) below this  -> shared metal
  int32_t metalMin;    // max(A,B) at/above    -> metal band
  int32_t bridgeMin;   // max(A,B) at/above    -> both in hands (body bridge)
  int32_t heldMin;     // min(A,B) at/above    -> both held (steady grip)
  int32_t metalDiff;   // |A-B| needed to say which hook is on metal
  int32_t handDiffA;   // A-B at/above         -> hook A in hand
  int32_t handDiffB;   // A-B at/below         -> hook B in hand (negative)
  int32_t bodyDrop;    // both hooks this far below free baseline -> body
};

// Measured (CPU cycles), SBOX-2026-9509:
//   shared metal 0-1 | body 1720-1738, ~200 below the free level 1 min earlier
//   free level 1675..1975 across sessions (42 min run: -80 over 15 min, then flat)
//   free A-B -36..+93 (one touch event +177) | A hand A-B +182..+213
//   B hand A-B -91..-58 | hand max 2107 | metal min 2352
//   metal crosstalk A-B +239..+261 / -266..-236 | both hands up to 56k
static const HookCaseLimits HOOK_CASE_LIMITS = {100, 2230, 3000, 1975, 120, 120, -40, 100};

// Baseline learning: needs BASE_LEARN_MS of continuous BOTH_FREE frames, then
// follows slow drift (time constant BASE_TAU_MS) only while the case is BOTH_FREE.
static const uint32_t BASE_LEARN_MS = 5000;
static const uint32_t BASE_TAU_MS = 30000;
// While BODY is shown the baseline still creeps toward the reading, far slower.
// Prevents a stale baseline (drift while anchored) from locking free as BODY;
// cost: a hook resting on the body for many minutes drifts toward "free".
// Both labels are NOT ANCHORED, so the safety state is unaffected.
static const uint32_t BASE_TAU_BODY_MS = 600000;

inline bool hookCaseAnchored(HookCase c) {
  return c == CASE_SHARED_METAL || c == CASE_A_METAL || c == CASE_B_METAL;
}

inline const char* hookCaseCode(HookCase c) {
  switch (c) {
    case CASE_SHARED_METAL: return "SHARED_METAL";
    case CASE_A_METAL:      return "A_METAL";
    case CASE_B_METAL:      return "B_METAL";
    case CASE_UNRECOGNISED: return "UNRECOGNISED";
    case CASE_BOTH_FREE:    return "BOTH_FREE";
    case CASE_BODY:         return "BODY";
    case CASE_A_HAND:       return "A_HAND";
    case CASE_B_HAND:       return "B_HAND";
    case CASE_BOTH_HANDS:   return "BOTH_HANDS";
    case CASE_SENSOR_FAULT: return "SENSOR_FAULT";
    default:                return "DETECTING";
  }
}

inline const char* hookCaseLabel(HookCase c) {
  switch (c) {
    case CASE_SHARED_METAL: return "Both hooks on shared metal";
    case CASE_A_METAL:      return "Hook A on metal";
    case CASE_B_METAL:      return "Hook B on metal";
    case CASE_UNRECOGNISED: return "Unrecognised reading";
    case CASE_BOTH_FREE:    return "Both hooks free";
    case CASE_BODY:         return "Hooks touching body";
    case CASE_A_HAND:       return "Hook A in hand";
    case CASE_B_HAND:       return "Hook B in hand";
    case CASE_BOTH_HANDS:   return "Both hooks in hands";
    case CASE_SENSOR_FAULT: return "Sensor fault";
    default:                return "Detecting";
  }
}

// Single-frame classification. Order matters: extremes first, then metal band,
// then body (only with a learned baseline), hand and free inside the idle band.
inline HookCase classifyHookFrame(bool validA, bool validB, int32_t a, int32_t b,
                                  bool baseReady, int32_t baseA, int32_t baseB,
                                  const HookCaseLimits& L) {
  if (!validA || !validB || a < 0 || b < 0) return CASE_SENSOR_FAULT;
  const int32_t hi = a > b ? a : b;
  const int32_t lo = a < b ? a : b;
  const int32_t d = a - b;
  if (hi < L.shortMax) return CASE_SHARED_METAL;
  if (hi >= L.bridgeMin) return CASE_BOTH_HANDS;
  if (hi >= L.metalMin) {
    if (d >= L.metalDiff) return CASE_A_METAL;
    if (d <= -L.metalDiff) return CASE_B_METAL;
    return CASE_UNRECOGNISED;
  }
  if (baseReady && a <= baseA - L.bodyDrop && b <= baseB - L.bodyDrop) return CASE_BODY;
  if (d >= L.handDiffA) return CASE_A_HAND;
  if (d <= L.handDiffB) return CASE_B_HAND;
  if (lo >= L.heldMin) return CASE_BOTH_HANDS;
  return CASE_BOTH_FREE;
}

// Fail-safe debounce: a not-anchored case is shown after UNSAFE_FRAMES
// consecutive frames, an anchored case only after SAFE_FRAMES.
// Until a free baseline is learned, BODY is never reported (free is shown).
class HookCaseTracker {
public:
  static const uint8_t UNSAFE_FRAMES = 3;
  static const uint8_t SAFE_FRAMES = 10;

  void reset() {
    shown_ = candidate_ = last_ = CASE_DETECTING; run_ = 0;
    relearnBaseline();
  }
  void relearnBaseline() {
    baseReady_ = false; learning_ = false; sumA_ = sumB_ = 0; count_ = 0; learnStart_ = 0;
  }

  HookCase update(bool validA, bool validB, int32_t a, int32_t b, uint32_t nowMs) {
    last_ = classifyHookFrame(validA, validB, a, b, baseReady_,
                              (int32_t)(baseA_ + 0.5f), (int32_t)(baseB_ + 0.5f), HOOK_CASE_LIMITS);
    learnBaseline(a, b, nowMs);
    if (last_ == candidate_) { if (run_ < 255) run_++; }
    else { candidate_ = last_; run_ = 1; }
    const uint8_t need = hookCaseAnchored(candidate_) ? SAFE_FRAMES : UNSAFE_FRAMES;
    if (candidate_ != shown_ && run_ >= need) shown_ = candidate_;
    lastMs_ = nowMs; haveLast_ = true;
    return shown_;
  }

  HookCase shown() const { return shown_; }
  HookCase lastFrame() const { return last_; }
  bool anchored() const { return hookCaseAnchored(shown_); }
  bool baselineReady() const { return baseReady_; }
  int32_t baselineA() const { return baseReady_ ? (int32_t)(baseA_ + 0.5f) : -1; }
  int32_t baselineB() const { return baseReady_ ? (int32_t)(baseB_ + 0.5f) : -1; }

private:
  void learnBaseline(int32_t a, int32_t b, uint32_t nowMs) {
    const bool free = last_ == CASE_BOTH_FREE;
    if (!baseReady_) {
      if (!free) { learning_ = false; sumA_ = sumB_ = 0; count_ = 0; return; }
      if (!learning_) { learning_ = true; learnStart_ = nowMs; sumA_ = sumB_ = 0; count_ = 0; }
      sumA_ += a; sumB_ += b; count_++;
      if ((uint32_t)(nowMs - learnStart_) >= BASE_LEARN_MS && count_ >= 10) {
        baseA_ = (float)sumA_ / count_; baseB_ = (float)sumB_ / count_;
        baseReady_ = true; learning_ = false;
      }
      return;
    }
    const bool body = last_ == CASE_BODY;
    if ((!free && !body) || !haveLast_) return;
    uint32_t dt = nowMs - lastMs_;
    if (dt > 2000) dt = 2000;  // ignore long stalls
    const float k = (float)dt / (float)(free ? BASE_TAU_MS : BASE_TAU_BODY_MS);
    baseA_ += (a - baseA_) * k;
    baseB_ += (b - baseB_) * k;
  }

  HookCase shown_ = CASE_DETECTING, candidate_ = CASE_DETECTING, last_ = CASE_DETECTING;
  uint8_t run_ = 0;
  bool baseReady_ = false, learning_ = false, haveLast_ = false;
  float baseA_ = 0, baseB_ = 0;
  int64_t sumA_ = 0, sumB_ = 0;
  uint32_t count_ = 0, learnStart_ = 0, lastMs_ = 0;
};
