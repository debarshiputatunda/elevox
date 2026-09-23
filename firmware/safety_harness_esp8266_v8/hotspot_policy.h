#pragma once
#include <stdint.h>
// Keep AP enabled, but do not starve saved-router association because a phone
// remains on the hotspot. ESP8266 shares its AP/STA radio channel.
struct HotspotPolicy {
  static const uint32_t STARTUP_QUIET_MS=1000U;
  bool startupComplete=false;
  void observe(uint32_t now,bool){if(!startupComplete && now>=STARTUP_QUIET_MS)startupComplete=true;}
  bool startupWaiting()const{return !startupComplete;}
  bool automaticAllowed()const{return startupComplete;}
};
