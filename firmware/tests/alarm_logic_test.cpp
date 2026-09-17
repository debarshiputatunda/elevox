#include <cassert>
#include "../safety_harness_esp8266_v5_old_sense/alarm_logic.h"
int main() {
  assert(!hooksExceeded(12000, 12000, 20000, 20000, true));
  assert(!hooksExceeded(12000, 12000, 10000, 20000, true));
  assert(hooksExceeded(12000, 12000, 12000, 12000, true));
  assert(hooksExceeded(0, 0, 0, 0, true));
  assert(!hooksExceeded(-1, 12000, 0, 0, true));
  assert(!hooksExceeded(12000, 12000, 0, 0, false));
  float smoothed=smoothHook(15000.0f,-1,1);
  assert(smoothed == -1.0f);
  assert(smoothHook(smoothed,15000,1) == 15000.0f);
  assert(!pulseExpired(1001, 1001));
  assert(pulseExpired(11001, 1001));
  assert(pulseExpired(9000, 0xfffffc18U)); // millis wrap: 10000 elapsed
}
