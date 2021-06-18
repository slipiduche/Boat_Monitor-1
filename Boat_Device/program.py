#New Puthon file
#!/usr/bin/python3

import modules.params as params;
import datetime;

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


print(data);

import threading

def printit():
  threading.Timer(5.0, printit).start()
  print ("Hello, World!")

printit()