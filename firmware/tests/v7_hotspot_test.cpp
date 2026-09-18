#include <cassert>
#include <cstdint>
#include "../safety_harness_esp8266_v7/hotspot_policy.h"
int main(){
  HotspotPolicy p;
  p.observe(0,false);assert(p.startupWaiting());assert(!p.automaticAllowed());
  p.observe(59999,false);assert(!p.automaticAllowed());
  p.observe(60000,false);assert(p.automaticAllowed());
  p.observe(61000,true);assert(!p.automaticAllowed());
  p.observe(90000,true);p.observe(90001,false);assert(!p.automaticAllowed());
  p.observe(209999,false);assert(!p.automaticAllowed());
  p.observe(210000,false);assert(p.automaticAllowed());
  // Startup must not restart when millis wraps, and grace spans rollover.
  p.observe(UINT32_MAX-1000,true);p.observe(1000,false);assert(!p.automaticAllowed());
  p.observe(118998,false);assert(!p.automaticAllowed());
  p.observe(118999,false);assert(p.automaticAllowed());assert(!p.startupWaiting());
}
