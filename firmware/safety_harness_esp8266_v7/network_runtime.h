#pragma once
void loadRouterWifi(){
  EEPROM.get(256,netStore);
  if(validNetworks(netStore))return;
  netStore=emptyNetworks();
  WifiSettings previous;EEPROM.get(96,previous);
  if(validWifiSettings(previous)){
    if(previous.ssid[0])saveNetwork(netStore,previous.ssid,previous.password,true);
    else netStore.autoConnect=0;
  }else if(SBOX_WIFI_SSID[0] && validWifiCredentials(SBOX_WIFI_SSID,SBOX_WIFI_PASSWORD)){
    saveNetwork(netStore,SBOX_WIFI_SSID,SBOX_WIFI_PASSWORD,true);
  }
  sealNetworks(netStore); // migration becomes durable on the next explicit profile save
}
bool persistNetworks(NetworkStore candidate){
  sealNetworks(candidate);
  NetworkStore previous;EEPROM.get(256,previous);
  if(memcmp(&candidate,&previous,sizeof(candidate))!=0){
    EEPROM.put(256,candidate);
    if(!EEPROM.commit()){EEPROM.put(256,previous);return false;}
  }
  netStore=candidate;return true;
}
void queueNetwork(int index){
  queuedNetwork=index;wifiApplyPending=true;wifiQueuedAt=millis();
}
void applyRouterWifi(){
  WiFi.setAutoReconnect(false);
  WiFi.disconnect(false); // STA only: never recreate the AP during a router change
  activeNetwork=queuedNetwork;
  if(activeNetwork>=0 && activeNetwork<netStore.count && netStore.autoConnect){
    const auto& n=netStore.networks[activeNetwork];
    WiFi.begin(n.ssid,n.password);wifiRetry.started(millis());
    Serial.printf("[WIFI] Attempt profile %d\n",activeNetwork+1);
  }else{activeNetwork=-1;wifiRetry.attempting=false;}
  wifiApplyPending=false;wasStationConnected=false;
}
void startHotspot(){
  WiFi.enableAP(true);
  IPAddress address(192,168,4,1),mask(255,255,255,0);
  bool ok=WiFi.softAPConfig(address,address,mask);
  ok=WiFi.softAP(apName.c_str(),nullptr,1,false,4)&&ok;
  dnsServer.stop();dnsServer.start(53,"*",address);
  Serial.printf("[WIFI] Open hotspot %s: %s, http://192.168.4.1/\n",apName.c_str(),ok?"ready":"failed");
}
void serviceWifi(){
  uint32_t now=millis();
  if(wifiApplyPending){if((uint32_t)(now-wifiQueuedAt)>=750)applyRouterWifi();return;}
  if(WiFi.status()==WL_CONNECTED){wifiRetry.connected();wasStationConnected=true;}
  else if(wasStationConnected){
    wasStationConnected=false;wifiRetry.failed(now); // allow AP access before retrying a lost router
  }else if(wifiRetry.timedOut(now)){
    WiFi.disconnect(false);wifiRetry.failed(now);
    Serial.println("[WIFI] Router attempt timed out; AP stays available");
  }else if(netStore.autoConnect && netStore.count && wifiRetry.ready(now,WiFi.softAPgetStationNum()>0)){
    // Try default first, then other profiles on failures. Never scan/retry while an AP client is configuring.
    int next=wifiRetry.failures==0?netStore.defaultIndex:(activeNetwork+1)%netStore.count;
    queueNetwork(next);
  }
  static uint32_t apChecked=0;
  if((uint32_t)(now-apChecked)>=15000){
    apChecked=now;
    if(!(WiFi.getMode()&WIFI_AP) || WiFi.softAPIP()==IPAddress(0,0,0,0))startHotspot();
  }
}
void showWifiStatus(){
  bool connected=WiFi.status()==WL_CONNECTED&&!wifiApplyPending;
  const char* state=!netStore.autoConnect||!netStore.count?"hotspot-only":connected?"connected":
    wifiApplyPending||wifiRetry.attempting?"connecting":WiFi.softAPgetStationNum()>0?"paused":"connection-failed";
  String json;json.reserve(1400);
  json="{\"status\":"+jsonString(state)+",\"active\":"+String(activeNetwork)+",\"default\":"+String(netStore.defaultIndex);
  json+=",\"auto_connect\":"+String(netStore.autoConnect?"true":"false")+",\"ap_ssid\":"+jsonString(apName.c_str());
  json+=",\"ap_ip\":"+jsonString(WiFi.softAPIP().toString().c_str())+",\"sta_ip\":"+jsonString(connected?WiFi.localIP().toString().c_str():"");
  json+=",\"profiles\":[";
  for(int i=0;i<netStore.count;i++){
    if(i)json+=',';
    json+="{\"ssid\":"+jsonString(netStore.networks[i].ssid)+",\"password\":"+jsonString(netStore.networks[i].password)+"}";
  }
  uint32_t freeSpace=ESP.getFreeSketchSpace();
  uint32_t otaMax=freeSpace>4096?(freeSpace-4096)&0xFFFFF000:0;
  json+="],\"sketch_bytes\":"+String(ESP.getSketchSize())+",\"ota_max_bytes\":"+String(otaMax)+",\"heap\":"+String(ESP.getFreeHeap())+"}";
  server.sendHeader("Cache-Control","no-store");server.send(200,"application/json",json);
}
void saveRouterWifi(){
  if(wifiApplyPending){server.send(409,"text/plain","Connection change queued; retry shortly");return;}
  String action=server.arg("action");if(!action.length())action="save";
  NetworkStore candidate=netStore;int index=-1;
  if(server.hasArg("index")){
    String raw=server.arg("index");
    if(raw.length()!=1||raw[0]<'0'||raw[0]>'4'){server.send(400,"text/plain","Invalid profile");return;}
    index=raw.toInt();
  }
  bool connectNow=false;
  if(action=="save"){
    if(!server.hasArg("ssid")||!server.hasArg("password")){server.send(400,"text/plain","SSID and password required");return;}
    String ssid=server.arg("ssid"),password=server.arg("password");
    if(ssid.length()!=strlen(ssid.c_str())||password.length()!=strlen(password.c_str())){server.send(400,"text/plain","Invalid text");return;}
    index=saveNetwork(candidate,ssid.c_str(),password.c_str(),server.arg("make_default")=="1");
    if(index<0){server.send(400,"text/plain","Use an SSID up to 32 bytes and an open or valid WPA password; maximum five profiles.");return;}
    candidate.autoConnect=1;connectNow=true;
  }else if(action=="default"){
    if(!setDefaultNetwork(candidate,index)){server.send(400,"text/plain","Invalid profile");return;}
  }else if(action=="connect"){
    if(index<0||index>=candidate.count){server.send(400,"text/plain","Invalid profile");return;}
    candidate.autoConnect=1;connectNow=true;
  }else if(action=="delete"){
    if(!removeNetwork(candidate,index)){server.send(400,"text/plain","Invalid profile");return;}
    // Keep the live network only if its profile remains present.
    if(index==activeNetwork){connectNow=true;index=candidate.count?candidate.defaultIndex:-1;}
    else if(index<activeNetwork){ /* adjust only after persistence succeeds below */ }
  }else if(action=="disconnect"){
    candidate.autoConnect=0;connectNow=true;index=-1;
  }else{server.send(400,"text/plain","Unknown network action");return;}
  if(!persistNetworks(candidate)){server.send(500,"text/plain","Could not save profiles; previous settings retained");return;}
  if(action=="delete"&&!connectNow && index<activeNetwork)activeNetwork--;
  if(connectNow){wifiRetry.connected();queueNetwork(index);}
  server.send(202,"application/json","{\"saved\":true}");
}
