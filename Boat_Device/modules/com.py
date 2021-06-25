from time import localtime
import serial

com = serial.Serial('/dev/ttyUSB0',115200, timeout = 7);

command = "Unknwon";

def get_com():
#{
    global command;

    try:

        com.open();
            
        com.write(command);
        
        data = com.read();

        com.close();

        if len(data) > 0:
            
            return data;
        
        else:

            return None;

    except Exception as e:

        print(e);

        return None;
#}