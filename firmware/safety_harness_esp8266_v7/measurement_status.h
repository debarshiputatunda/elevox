#pragma once
#include <stdint.h>
enum MutualStatus { MUTUAL_WAITING, MUTUAL_OK, MUTUAL_RESET_TIMEOUT, MUTUAL_RISE_TIMEOUT, MUTUAL_BELOW_RESOLUTION };
inline const char* mutualStatusName(MutualStatus status){
 switch(status){case MUTUAL_OK:return "ok";case MUTUAL_RESET_TIMEOUT:return "reset_timeout";case MUTUAL_RISE_TIMEOUT:return "rise_timeout";case MUTUAL_BELOW_RESOLUTION:return "below_resolution";default:return "waiting";}
}
template<class Stat>int32_t observedHookMean(const Stat& stat,bool ready,unsigned sampleCount){return ready&&stat.timeouts<sampleCount?(int32_t)stat.mean:-1;}
