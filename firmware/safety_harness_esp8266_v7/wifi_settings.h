#pragma once
#include <stdint.h>
#include <string.h>

struct WifiSettings {
  uint32_t magic;
  char ssid[33];
  char password[65];
  uint32_t checksum;
};
static_assert(sizeof(WifiSettings)+96<=256,"Wi-Fi settings exceed EEPROM allocation");

inline bool validWifiCredentials(const char* ssid,const char* password){
  size_t n=strlen(ssid),p=strlen(password);
  if(n>32 || p>64 || (n==0 && p!=0)) return false;
  if(p==0 || (p>=8 && p<=63)) return true;
  if(p!=64) return false;
  for(size_t i=0;i<p;i++){
    char c=password[i];
    if(!((c>='0'&&c<='9')||(c>='a'&&c<='f')||(c>='A'&&c<='F'))) return false;
  }
  return true;
}
inline uint32_t wifiChecksum(const WifiSettings& s){
  uint32_t hash=2166136261U;
  for(size_t i=0;i<sizeof(s.ssid);i++) hash=(hash^(uint8_t)s.ssid[i])*16777619U;
  for(size_t i=0;i<sizeof(s.password);i++) hash=(hash^(uint8_t)s.password[i])*16777619U;
  return hash;
}
inline WifiSettings makeWifiSettings(const char* ssid,const char* password){
  WifiSettings result={}; result.magic=0x57494631;
  strncpy(result.ssid,ssid,sizeof(result.ssid)-1);
  strncpy(result.password,password,sizeof(result.password)-1);
  result.checksum=wifiChecksum(result); return result;
}
inline bool validWifiSettings(const WifiSettings& s){
  return s.magic==0x57494631 && memchr(s.ssid,0,sizeof(s.ssid)) &&
    memchr(s.password,0,sizeof(s.password)) && validWifiCredentials(s.ssid,s.password) &&
    s.checksum==wifiChecksum(s);
}
