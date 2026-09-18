#include <cassert>
#include <cstring>
#include <map>
#include <string>
#define INPUT 0
#define OUTPUT 1
#define HIGH 1
#define LOW 0
void pinMode(int,int){} void digitalWrite(int,int){} void delayMicroseconds(unsigned){}
void noInterrupts(){} void interrupts(){} void yield(){}
struct {unsigned t=0;unsigned getCycleCount(){return ++t;}} ESP;
#define GPI 0u
#include "../safety_harness_esp8266_v7/hook_sensing.h"
#include "../safety_harness_esp8266_v7/sensing_settings.h"
#include "../safety_harness_esp8266_v7/prediction_calibration.h"
using namespace prediction_calibration;
struct String:std::string {
 using std::string::string;
 String(const std::string& s):std::string(s){}
 String operator+(unsigned n)const{return String(std::string(*this)+std::to_string(n));}
 String operator+(const char* p)const{return String(std::string(*this)+p);}
};
struct {String request;int status=0;String response;
 String arg(const char*){return request;}
 void send(int status_,const char*,String response_){status=status_;response=response_;}
 void sendHeader(const char*,const char*){}
} server;
struct {unsigned char ram[2048]={},flash[2048]={};bool fail=false;int commits=0;
 template<class T>void get(unsigned o,T& x){memcpy(&x,ram+o,sizeof(x));}
 template<class T>void put(unsigned o,const T& x){memcpy(ram+o,&x,sizeof(x));}
 bool commit(){commits++;if(fail)return false;memcpy(flash,ram,sizeof(ram));return true;}
} EEPROM;
SensingMode sensingMode=LOW_BATCH;
HookFrameSampler hookSampler;
bool sensingFrameActive=true,mutualValid=true,bridged=true,hookViolation=true;
uint32_t sensingRevision=0,dispA=100,dispB=100,mutualAB=100;
int linkIdx=100,loadA=100,loadB=100;
float emaA=100,emaB=100;
CapStat hookA={0,0,100,true,0},hookB=hookA;
uint8_t hkA=1,hkB=1,histI=4,hist[7]={1,1,1,1,1,1,1};
enum State{ST_FREE,ST_CONTACT};State rawState=ST_CONTACT,stableState=ST_CONTACT;
PredictionCalibration calibration={};CalibrationSession calibrationSession;
bool calibrationHandled=false;const char* calibrationSaveError="";
#include "../safety_harness_esp8266_v7/sensing_runtime.h"
PredictionCalibration profile(unsigned baseline){
 PredictionCalibration p={};p.magic=kMagic;p.version=kVersion;p.mode=1;
 p.baselineA=p.baselineB=baseline;p.referenceA=p.referenceB=baseline+200;
 p.deltaA=p.deltaB=200;p.directionA=p.directionB=1;p.checksum=calibrationChecksum(p);
 assert(validCalibration(p));return p;
}
int main(){
 auto high=profile(1000),low=profile(2000),alternate=profile(3000);
 EEPROM.put(calibrationOffset(0),high);EEPROM.put(calibrationOffset(1),low);EEPROM.put(calibrationOffset(2),alternate);
 assert(saveSensingMode(EEPROM,1));loadSensingCalibration();assert(calibration.baselineA==2000);
 hookSampler.begin(5,4,LOW_BATCH);assert(!hookSampler.step());
 unsigned char before[2048];memcpy(before,EEPROM.ram,sizeof(before));
 EEPROM.fail=true;server.request="2";saveSensingSelection();assert(server.status==500);
 assert(sensingMode==LOW_BATCH&&sensingFrameActive&&sensingRevision==0&&emaA==100&&hookA.valid);
 assert(calibration.baselineA==2000&&!memcmp(before,EEPROM.ram,sizeof(before)));
 EEPROM.fail=false;
 calibrationSession.beginStep(1,0,1);int commits=EEPROM.commits;
 saveSensingSelection();assert(server.status==409&&EEPROM.commits==commits&&sensingMode==LOW_BATCH);
 calibrationSession.cancel();
 server.request="2junk";saveSensingSelection();assert(server.status==400&&EEPROM.commits==commits);
 server.request="2";saveSensingSelection();assert(server.status==200);
 assert(sensingMode==LOW_ALTERNATING&&sensingRevision==1&&!sensingFrameActive);
 assert(emaA==-1&&emaB==-1&&!hookA.valid&&!hookB.valid&&!mutualValid&&!hookViolation);
 assert(!hookSampler.resultA().valid&&hookSampler.step()); // Aborted, not an old partial frame.
 assert(calibration.baselineA==3000&&histI==0&&stableState==ST_FREE);
 assert(!memcmp(before+44,EEPROM.ram+44,52)); // Threshold and edit metadata untouched.
 commits=EEPROM.commits;saveSensingSelection();assert(EEPROM.commits==commits&&sensingRevision==1);
 server.request="0";saveSensingSelection();assert(calibration.baselineA==1000&&sensingRevision==2);
 server.request="1";saveSensingSelection();assert(calibration.baselineA==2000&&sensingRevision==3);
 assert(loadSensingMode(EEPROM)==1);
}
