#pragma once
#include <stdint.h>
// ESP8266 shares one radio between AP and STA. Automatic association can move
// the AP channel, so give initial setup and recently connected clients priority.
struct HotspotPolicy {
  static const uint32_t STARTUP_QUIET_MS=60000U;
  static const uint32_t CLIENT_GRACE_MS=120000U;
  bool startupComplete=false,clientGrace=false;
  uint32_t lastClientAt=0;
  void observe(uint32_t now,bool clients){
    if(!startupComplete && now>=STARTUP_QUIET_MS)startupComplete=true;
    if(clients){lastClientAt=now;clientGrace=true;}
    else if(clientGrace && (uint32_t)(now-lastClientAt)>=CLIENT_GRACE_MS)clientGrace=false;
  }
  bool startupWaiting()const{return !startupComplete;}
  bool automaticAllowed()const{return startupComplete&&!clientGrace;}
};
