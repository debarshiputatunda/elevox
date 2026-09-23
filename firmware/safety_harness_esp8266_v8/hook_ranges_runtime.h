#pragma once
inline void rangeJson(char* out,unsigned size,const HookRanges& r){
 snprintf(out,size,"\"hook_alarm_ranges\":{\"a\":[[%u,%u],[%u,%u]],\"b\":[[%u,%u],[%u,%u]]},\"hook_ranges_revision\":%u",r.bounds[0][0],r.bounds[0][1],r.bounds[0][2],r.bounds[0][3],r.bounds[1][0],r.bounds[1][1],r.bounds[1][2],r.bounds[1][3],r.revision);
}
inline bool parseRangeInteger(const char* name,uint32_t& value,uint32_t maxValue){
 String text=server.arg(name);if(!text.length()||text.length()>10)return false;
 uint64_t result=0;for(unsigned i=0;i<text.length();i++){if(text[i]<'0'||text[i]>'9')return false;result=result*10+(text[i]-'0');if(result>maxValue)return false;}
 value=(uint32_t)result;return true;
}
void saveHookRangeRequest(){
 uint32_t expected;HookRanges candidate=hookRanges;
 const char* names[2][4]={{"a0_min","a0_max","a1_min","a1_max"},{"b0_min","b0_max","b1_min","b1_max"}};
 if(!parseRangeInteger("expected_revision",expected,UINT32_MAX)){server.send(400,"text/plain","Expected revision required");return;}
 for(unsigned h=0;h<2;h++)for(unsigned i=0;i<4;i++)if(!parseRangeInteger(names[h][i],candidate.bounds[h][i],1000000)){server.send(400,"text/plain","Eight integer bounds from 0 to 1000000 required");return;}
 if(!validRangeBounds(candidate)){server.send(400,"text/plain","Ranges must be ordered and non-overlapping");return;}
 if(expected!=hookRanges.revision){server.send(409,"text/plain","Ranges changed. Refresh before saving.");return;}
 if(!saveHookRanges(EEPROM,hookRanges,candidate)){server.send(500,"text/plain","Could not save alarm ranges");return;}
 hookViolation=bothHooksInRanges(hookA.valid?(int32_t)hookA.mean:-1,hookB.valid?(int32_t)hookB.mean:-1,hookRanges);
 char fields[240],body[270];rangeJson(fields,sizeof(fields),hookRanges);snprintf(body,sizeof(body),"{\"saved\":true,%s}",fields);
 server.sendHeader("Cache-Control","no-store");server.send(200,"application/json",body);
}
