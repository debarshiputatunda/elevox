#pragma once
#include <stdint.h>
#include <string.h>
#include <stddef.h>
struct DevicePreferences {
  uint32_t magic;
  char name[33];
  uint8_t light;
  uint8_t reserved[2];
  uint32_t checksum;
};
inline bool validDeviceName(const char* name){
  size_t n=strlen(name);if(n==0||n>32||name[0]==' '||name[n-1]==' ')return false;
  for(size_t i=0;i<n;i++){
    char c=name[i];if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c==' '||c=='-'||c=='_'))return false;
  }
  return true;
}
inline uint32_t preferencesChecksum(const DevicePreferences& p){
  uint32_t h=2166136261U;const uint8_t* bytes=(const uint8_t*)&p;
  for(size_t i=0;i<offsetof(DevicePreferences,checksum);i++)h=(h^bytes[i])*16777619U;
  return h;
}
inline DevicePreferences makePreferences(const char* name,bool light){
  DevicePreferences p={};p.magic=0x44505632;strncpy(p.name,name,32);p.light=light;p.checksum=preferencesChecksum(p);return p;
}
inline bool validPreferences(const DevicePreferences& p){
  return p.magic==0x44505632 && memchr(p.name,0,sizeof(p.name)) && p.light<=1 && validDeviceName(p.name) && p.checksum==preferencesChecksum(p);
}
static_assert(sizeof(DevicePreferences)<=64,"Preferences overlap calibration area");
