#include <cassert>
#include <cstdint>
#include <cstring>
#include <string>
#include <map>
#include <type_traits>
#include "../safety_harness_esp8266_v8/network_profiles.h"
struct String:std::string {
  using std::string::string;
  String(const std::string& s):std::string(s){}
  template<class T,typename std::enable_if<std::is_arithmetic<T>::value,int>::type=0>
  String(T n):std::string(std::to_string(n)){}
  int toInt()const{return std::stoi(*this);}
};
String jsonString(const char* s){return String("\"")+s+"\"";}
struct IPAddress {
  uint32_t value;
  IPAddress(int a,int b,int c,int d):value((uint32_t(a)<<24)|(b<<16)|(c<<8)|d){}
  bool operator==(IPAddress other)const{return value==other.value;}
  String toString()const{return "192.168.4.1";}
};
const int WIFI_AP=2,WL_CONNECTED=3;
uint32_t nowMs=0;
uint32_t millis(){return nowMs;}
struct FakeWifi {
  int clients=0,statusValue=0,mode=WIFI_AP,begins=0,disconnects=0,apStarts=0;
  bool staEnabled=false,autoReconnect=false;
  IPAddress apIP=IPAddress(192,168,4,1);
  void setAutoReconnect(bool enabled){autoReconnect=enabled;}
  void disconnect(bool off,bool erase){assert(off&&!erase);disconnects++;staEnabled=false;statusValue=0;}
  String lastSSID;void begin(const char* ssid,const char*){lastSSID=ssid;begins++;staEnabled=true;}
  void enableAP(bool enabled){assert(enabled);mode|=WIFI_AP;}
  bool softAPConfig(IPAddress,IPAddress,IPAddress){return true;}
  bool softAP(const char*,const char*,int,bool,int){apStarts++;apIP=IPAddress(192,168,4,1);return true;}
  int softAPgetStationNum(){return clients;}
  int status(){return statusValue;}
  int getMode(){return mode;}
  int channel(){return 1;}
  IPAddress softAPIP(){return apIP;}
  IPAddress localIP(){return IPAddress(10,0,0,2);}
} WiFi;
struct FakeEeprom {
  uint8_t ram[2048]={},flash[2048]={};bool fail=false;
  template<class T> void get(int o,T& out){memcpy(&out,ram+o,sizeof(out));}
  template<class T> void put(int o,const T& value){memcpy(ram+o,&value,sizeof(value));}
  bool commit(){if(fail)return false;memcpy(flash,ram,sizeof(ram));return true;}
  void reboot(){memcpy(ram,flash,sizeof(ram));}
} EEPROM;
struct FakeSerial {
  template<class... T> void printf(const char*,T...){}
  void println(const char*){}
} Serial;
struct FakeDns {void stop(){} void start(int,const char*,IPAddress){}} dnsServer;
struct FakeEsp {uint32_t getFreeSketchSpace(){return 1024000;} uint32_t getSketchSize(){return 400000;} uint32_t getFreeHeap(){return 20000;}} ESP;
struct FakeServer {
  std::map<std::string,String> args;String body;
  String arg(const char* name){return args[name];}
  bool hasArg(const char* name){return args.count(name);}
  void sendHeader(const char*,const char*){}
  void send(int,const char*,String content){body=content;}
} server;
struct FakeMdns {int changes=0,announcements=0;void notifyAPChange(){changes++;}void announce(){announcements++;}} MDNS;
const char* MDNS_NAME="sbox-test";
const char *SBOX_WIFI_SSID="",*SBOX_WIFI_PASSWORD="";
NetworkStore netStore=emptyNetworks();NetworkRetry wifiRetry;
int queuedNetwork=-1,activeNetwork=-1;
bool wifiApplyPending=false,wasStationConnected=false;
uint32_t wifiQueuedAt=0;String apName="TestAP";
#include "../safety_harness_esp8266_v8/network_runtime.h"
void tick(uint32_t time){nowMs=time;serviceWifi();}
int main(){
 saveNetwork(netStore,"backup","password",false);saveNetwork(netStore,"preferred","password",true);assert(persistNetworks(netStore));
 EEPROM.reboot();netStore=emptyNetworks();loadRouterWifi();assert(netStore.defaultIndex==1&&netStore.autoConnect);
 startHotspot();WiFi.clients=1; // A hotspot client must not prevent the saved default from connecting.
 tick(0);tick(999);assert(WiFi.begins==0);
 tick(1000);assert(wifiApplyPending);tick(1750);assert(WiFi.begins==1&&WiFi.lastSSID=="preferred");
 tick(2000);assert(wifiRetry.attempting&&WiFi.staEnabled&&automaticAttemptCancelledCount==0);
 WiFi.statusValue=WL_CONNECTED;tick(2100);assert(wasStationConnected);int starts=WiFi.begins;
 tick(10000);assert(WiFi.begins==starts&&WiFi.apStarts==1);
 // Loss reconnects the preferred network after bounded delay, even with AP clients.
 WiFi.statusValue=0;tick(11000);tick(12000);tick(12750);assert(WiFi.begins==starts+1&&WiFi.lastSSID=="preferred");
 // Failed attempts back off, then rotate saved profiles; AP remains enabled.
 tick(42750);assert(!wifiRetry.attempting&&!WiFi.staEnabled);starts=WiFi.begins;
 tick(102749);assert(WiFi.begins==starts&&!wifiApplyPending);tick(102750);tick(103500);assert(WiFi.lastSSID=="backup");assert(WiFi.mode&WIFI_AP);
 // Explicit Disconnect persists and suppresses automatic retries.
 server.args={{"action","disconnect"}};saveRouterWifi();tick(104250);tick(500000);assert(!netStore.autoConnect&&!wifiApplyPending&&!WiFi.staEnabled);
 // Selecting default re-enables auto-connect and queues the requested profile.
 server.args={{"action","default"},{"index","1"}};saveRouterWifi();assert(netStore.autoConnect&&wifiApplyPending);tick(500750);assert(WiFi.lastSSID=="preferred");
 EEPROM.reboot();netStore=emptyNetworks();loadRouterWifi();assert(netStore.autoConnect&&netStore.defaultIndex==1);
 // Failed persistence neither changes live default nor queues a connection.
 wifiApplyPending=false;EEPROM.fail=true;server.args={{"action","default"},{"index","0"}};saveRouterWifi();assert(netStore.defaultIndex==1&&!wifiApplyPending);
 EEPROM.fail=false;EEPROM.commit();EEPROM.reboot();loadRouterWifi();assert(netStore.defaultIndex==1);
 // Empty profile storage never launches an automatic association.
 wifiApplyPending=false;wifiRetry.connected();wasStationConnected=false;WiFi.statusValue=0;netStore=emptyNetworks();starts=WiFi.begins;
 tick(550000);assert(!wifiApplyPending&&WiFi.begins==starts);
 loadRouterWifi();
 // Missing hotspot is restored while profiles remain saved.
 WiFi.mode=0;tick(600000);assert(WiFi.mode&WIFI_AP);assert(netStore.count==2);
}
