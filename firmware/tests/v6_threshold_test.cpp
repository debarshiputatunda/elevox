#include <cassert>
#include "../safety_harness_esp8266_v6/threshold_settings.h"
int main(){
 ThresholdState s;
 assert(updateThresholds(s,0,100000,0,false));
 assert(s.enabled && s.baseValid && !s.pending && s.baseA==0 && s.revision==1);
 assert(updateThresholds(s,20,30,1,true));
 assert(s.pending && s.baseA==0 && s.baseB==100000 && s.revision==2);
 assert(!updateThresholds(s,0,100000,1,false)); // stale backend must not erase local edit
 assert(s.a==20 && s.pending);
 assert(updateThresholds(s,20,30,2,false));
 assert(!s.pending && s.baseA==20 && s.revision==2);
 assert(!updateThresholds(s,100001,0,2,true));
 auto previous=s;assert(updateThresholds(s,40,50,2,true));s=previous; // persistence rollback snapshot
 assert(s.a==20 && !s.pending);
}
