#pragma once
void setBuckleAlarm(){
 String raw=server.arg("enabled");
 if(raw!="0"&&raw!="1"){server.send(400,"text/plain","Buckle alarms must be 0 or 1");return;}
 bool enabled=raw=="1";
 if(!saveBuckleAlarm(EEPROM,enabled)){
  server.send(500,"text/plain","Could not save buckle alarms; previous setting retained");return;
 }
 buckleAlarmEnabled=enabled;
 server.sendHeader("Cache-Control","no-store");
 server.send(200,"application/json",enabled?"{\"saved\":true,\"enabled\":true}":"{\"saved\":true,\"enabled\":false}");
}
