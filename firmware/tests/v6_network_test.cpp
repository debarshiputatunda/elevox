#include <cassert>
#include <cstring>
#include <cstdio>
#include "../safety_harness_esp8266_v6/network_profiles.h"
int main(){
 auto store=emptyNetworks();assert(validNetworks(store));
 assert(saveNetwork(store,"Factory","example-pass",true)==0);
 assert(saveNetwork(store,"Lab","second-pass",false)==1);
 assert(store.defaultIndex==0 && store.count==2);
 assert(saveNetwork(store,"Factory","changed-pass",false)==0 && store.count==2);
 assert(setDefaultNetwork(store,1));assert(store.defaultIndex==1);
 assert(removeNetwork(store,0));assert(store.count==1 && store.defaultIndex==0);
 assert(saveNetwork(store,"Bad","short",false)==-1);
 for(int i=1;i<5;i++){char n[8];snprintf(n,sizeof(n),"N%d",i);assert(saveNetwork(store,n,"",false)>=0);}
 assert(saveNetwork(store,"Overflow","",false)==-1);
 sealNetworks(store);assert(validNetworks(store));
 auto restored=store;restored.networks[0].password[0]='!';assert(!validNetworks(restored));
 NetworkRetry retry;retry.started(100);
 assert(!retry.timedOut(30100-1));assert(retry.timedOut(30100));
 retry.failed(30100);assert(!retry.ready(90100,true));assert(retry.ready(90100,false));
 retry.started(90100);retry.failed(120100);assert(!retry.ready(180100,false));assert(retry.ready(240100,false));
 retry.connected();assert(retry.failures==0);
}
