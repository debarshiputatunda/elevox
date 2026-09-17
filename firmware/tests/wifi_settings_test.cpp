#include <cassert>
#include <cstring>
#include "../safety_harness_esp8266_v5_old_sense/wifi_settings.h"
int main(){
  assert(validWifiCredentials("Site WiFi","abcdefgh"));
  assert(validWifiCredentials("Open WiFi",""));
  assert(!validWifiCredentials("Site WiFi","short"));
  assert(!validWifiCredentials("","abcdefgh"));
  assert(validWifiCredentials("",""));
  char hexKey[65]; memset(hexKey,'a',64); hexKey[64]=0;
  assert(validWifiCredentials("Site WiFi",hexKey));
  hexKey[63]='z'; assert(!validWifiCredentials("Site WiFi",hexKey));
  assert(!validWifiCredentials("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg","abcdefgh"));
  WifiSettings saved=makeWifiSettings("Site \"WiFi\"","abcdefgh");
  assert(validWifiSettings(saved));
  WifiSettings restored; memcpy(&restored,&saved,sizeof(saved));
  assert(validWifiSettings(restored));
  assert(strcmp(restored.ssid,"Site \"WiFi\"")==0);
  restored.password[0]='x'; assert(!validWifiSettings(restored));
  restored=saved; memset(restored.ssid,'a',sizeof(restored.ssid));
  restored.checksum=wifiChecksum(restored); assert(!validWifiSettings(restored));
  WifiSettings cleared=makeWifiSettings("",""); assert(validWifiSettings(cleared));
}
