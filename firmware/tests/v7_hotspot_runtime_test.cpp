#include <cassert>
#include <cstdint>
#include <cstring>
#include <string>
#include <map>
#include <type_traits>
#include "../safety_harness_esp8266_v7/network_profiles.h"
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
  void begin(const char*,const char*){begins++;staEnabled=true;}
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
  template<class T> void get(int,T& out){out=T{};}
  template<class T> void put(int,const T&){}
  bool commit(){return true;}
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
const char *SBOX_WIFI_SSID="",*SBOX_WIFI_PASSWORD="";
NetworkStore netStore=emptyNetworks();NetworkRetry wifiRetry;
int queuedNetwork=-1,activeNetwork=-1;
bool wifiApplyPending=false,wasStationConnected=false;
uint32_t wifiQueuedAt=0;String apName="TestAP";
#include "../safety_harness_esp8266_v7/network_runtime.h"
void tick(uint32_t time){nowMs=time;serviceWifi();}
int main(){
  saveNetwork(netStore,"router","password",true);
  startHotspot();assert(hotspotStartCount==1);
  tick(0);tick(5000);tick(59999);assert(!wifiApplyPending&&WiFi.begins==0);
  showWifiStatus();assert(server.body.find("startup-wait")!=std::string::npos);
  tick(60000);assert(wifiApplyPending&&!queuedNetworkExplicit);
  // Client arrives during queued delay: no STA association, bounded retry.
  WiFi.clients=1;tick(60750);assert(!wifiApplyPending&&WiFi.begins==0);
  assert(automaticAttemptCancelledCount==1&&!WiFi.staEnabled);
  tick(90000);WiFi.clients=0;tick(209999);assert(!wifiApplyPending);
  tick(210000);assert(wifiApplyPending);tick(210750);assert(WiFi.begins==1&&wifiRetry.attempting);
  // Client arrives after the auto association started: turn STA off.
  WiFi.clients=1;tick(211000);assert(!wifiRetry.attempting&&!WiFi.staEnabled);
  assert(automaticAttemptCancelledCount==2);
  // Explicit Connect overrides client grace and startup hold.
  queueNetwork(0);tick(211750);assert(WiFi.begins==2&&activeNetworkExplicit);
  tick(212000);assert(wifiRetry.attempting&&WiFi.staEnabled);
  WiFi.statusValue=WL_CONNECTED;tick(212100);assert(wasStationConnected);
  int disconnects=WiFi.disconnects;tick(213000);assert(WiFi.disconnects==disconnects);
  // Losing a router must stop background STA scans until a future eligible retry.
  WiFi.statusValue=0;tick(214000);assert(!WiFi.staEnabled);
  // Direct apply also rechecks the queue/client race.
  WiFi.clients=0;tick(334000);assert(wifiApplyPending);
  WiFi.clients=1;applyRouterWifi();assert(!wifiApplyPending&&WiFi.begins==2);
  // Explicit Disconnect retains stored profile and AP; stops STA.
  server.args["action"]="disconnect";saveRouterWifi();tick(334750);
  assert(!netStore.autoConnect&&netStore.count==1&&!WiFi.staEnabled&&WiFi.mode==WIFI_AP);
  assert(hotspotStartCount==1&&WiFi.apStarts==1);
  // Recovery is bounded and only starts a missing AP.
  WiFi.mode=0;tick(350000);assert(hotspotStartCount==2);
  tick(350001);tick(400000);assert(hotspotStartCount==2);
  // Explicit attempt also stops STA at timeout, retaining hotspot.
  netStore.autoConnect=1;queueNetwork(0);tick(400750);tick(430750);
  assert(!wifiRetry.attempting&&!WiFi.staEnabled&&hotspotStartCount==2);
  showWifiStatus();assert(server.body.find("router_attempt_count\":3")!=std::string::npos);
  // A successful automatic association is retained even if a client arrives.
  WiFi.clients=0;tick(600000);assert(wifiApplyPending);tick(600750);
  WiFi.statusValue=WL_CONNECTED;WiFi.clients=1;disconnects=WiFi.disconnects;
  tick(600751);assert(WiFi.disconnects==disconnects&&wasStationConnected);
  // Explicit requests are usable even inside the boot quiet period.
  hotspotPolicy=HotspotPolicy{};nowMs=100;queueNetwork(0);tick(850);
  assert(wifiRetry.attempting&&activeNetworkExplicit&&hotspotPolicy.startupWaiting());
}
