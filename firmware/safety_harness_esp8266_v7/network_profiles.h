#pragma once
#include <stddef.h>
#include "wifi_settings.h"
const uint8_t MAX_NETWORKS=5;
struct NetworkProfile { char ssid[33]; char password[65]; };
struct NetworkStore {
  uint32_t magic;
  uint8_t count,defaultIndex,autoConnect,reserved;
  NetworkProfile networks[MAX_NETWORKS];
  uint8_t padding[2];
  uint32_t checksum;
};
static_assert(sizeof(NetworkStore)+256<=1024,"Network profiles exceed EEPROM allocation");
inline uint32_t networksChecksum(const NetworkStore& s){
  uint32_t h=2166136261U; const uint8_t* b=(const uint8_t*)&s;
  for(size_t i=0;i<offsetof(NetworkStore,checksum);i++)h=(h^b[i])*16777619U;
  return h;
}
inline void sealNetworks(NetworkStore& s){s.checksum=networksChecksum(s);}
inline NetworkStore emptyNetworks(){NetworkStore s={};s.magic=0x57494632;s.autoConnect=1;sealNetworks(s);return s;}
inline bool validNetworks(const NetworkStore& s){
  if(s.magic!=0x57494632 || s.count>MAX_NETWORKS || s.autoConnect>1 ||
     (s.count && s.defaultIndex>=s.count) || s.checksum!=networksChecksum(s))return false;
  for(uint8_t i=0;i<s.count;i++){
    const auto& n=s.networks[i];
    if(!memchr(n.ssid,0,sizeof(n.ssid)) || !memchr(n.password,0,sizeof(n.password)) ||
       !n.ssid[0] || !validWifiCredentials(n.ssid,n.password))return false;
  }
  return true;
}
inline int saveNetwork(NetworkStore& s,const char* ssid,const char* password,bool makeDefault){
  if(!ssid[0] || !validWifiCredentials(ssid,password))return -1;
  int index=-1;
  for(uint8_t i=0;i<s.count;i++)if(strcmp(s.networks[i].ssid,ssid)==0)index=i;
  if(index<0){if(s.count==MAX_NETWORKS)return -1;index=s.count++;}
  auto& n=s.networks[index];memset(&n,0,sizeof(n));
  strncpy(n.ssid,ssid,sizeof(n.ssid)-1);strncpy(n.password,password,sizeof(n.password)-1);
  if(makeDefault)s.defaultIndex=index;
  sealNetworks(s);return index;
}
inline bool setDefaultNetwork(NetworkStore& s,int index){
  if(index<0||index>=s.count)return false;s.defaultIndex=index;sealNetworks(s);return true;
}
inline bool removeNetwork(NetworkStore& s,int index){
  if(index<0||index>=s.count)return false;
  for(int i=index;i+1<s.count;i++)s.networks[i]=s.networks[i+1];
  s.count--;memset(&s.networks[s.count],0,sizeof(NetworkProfile));
  if(s.defaultIndex==index)s.defaultIndex=0;else if(s.defaultIndex>index)s.defaultIndex--;
  sealNetworks(s);return true;
}
struct NetworkRetry {
  bool attempting=false;uint8_t failures=0;uint32_t stamp=0,waitMs=0;
  void started(uint32_t now){attempting=true;stamp=now;}
  bool timedOut(uint32_t now)const{return attempting && (uint32_t)(now-stamp)>=30000U;}
  void failed(uint32_t now){attempting=false;stamp=now;if(failures<5)failures++;waitMs=60000U*failures;}
  bool ready(uint32_t now,bool apClients)const{return !attempting&&!apClients&&(uint32_t)(now-stamp)>=waitMs;}
  void connected(){attempting=false;failures=0;waitMs=0;}
};
