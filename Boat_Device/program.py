#New Puthon file
#!/usr/bin/python3

from Boat_Device.modules.params import get_status

import modules.file as file

import modules.IO as IO;
import modules.params as params;
import threading;
import datetime;
import signal;
import sys;
import time;

boat_id = 1;

journey_id = 1;

fl = None #'journeys/1/B1_20210608193736198.txt';

dt = datetime.datetime.today();

data = {
    "journey_id":journey_id,
    "weight":params.get_weight(),
    "temperature":params.get_temp(),
    "dt":dt.strftime("%Y/%m/%d %H:%M:%S.%f")[:-3],
    "dt2":dt.strftime("%Y/%m/%d %H:%M:%S.%f")
}

def status():

  global journey_id, boat_id, fl;

  temp = params.get_temp();

  weight = params.get_weight();

  cont_status = params.get_status();


  if(cont_status):
    
    print("lid open");

  else:

    print("lid closed");
    

  data = {
  
      "temp":temp,
      "cont_weight":weight,
      "cont_status":cont_status,
      "dt":dt.strftime("%Y/%m/%d %H:%M:%S.%f")[:-3],
  }

  file.mkdir("journeys/" + str(journey_id));

  fl = file.genFile(journey_id,boat_id,fl);

  file.writeData(data);

  print(data);


t1 = threading.Thread(target=IO.set_lid_sensor,args=(status,));

t1.start();

# t2 = threading.Thread();

def signal_handler(sig, frame):

    print('End of Porgram');
    
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

print('Press Ctrl+C')

signal.pause()



