#New Puthon file
#!/usr/bin/python3





# import http.client
# import ssl
# import json

# conn = http.client.HTTPSConnection('localhost',8443,context = ssl._create_unverified_context())

# headers = {'Content-type': 'application/json'}

# foo = {'text': 'Hello HTTP #1 **cool**, and #1!'}
# json_data = json.dumps(foo)

# #conn.get('/kitty-pon',verify=False)

# conn.request('POST', '/kitty-pon', json_data, headers)

# response = conn.getresponse()


# print(json.loads(response.read().decode())["murp"])

import requests
import datetime
import sys
import os

import urllib3
import json

boat_id = 1;

journey_id = 1;

fl = None #'journeys/1/B1_20210608193736198.txt';

def genFile(journey_id,boat_id):
#{
    global fl;

    if(not fl):
        
        dt = datetime.datetime.today();

        fl_name = "B" + str(boat_id) + "_" + dt.strftime("%Y%m%d%H%M%S%f")[:-3] + ".txt";

        fl_path = "journeys/" + str(journey_id) + "/";

        fl = fl_path + fl_name;

    print(fl);

    return fl;
#}    

def exists(path):
#{
    return os.path.isfile(path);
#}

def writeData(data,last):
#{
    global journey_id, boat_id;

    path = genFile(journey_id,boat_id);

    j = json.dumps(data);
   
    w = "";

    if(exists(path)):
        
        w = "," + j;

        if(last):
            w += "]";

    else:
        w = "[" + j;
    
    fl = open(path,'a');

    fl.write(w);

    fl.close();
    
#}

from modules.params import getTemp as get_temp;
from modules.params import get_location
from modules.params import get_status
from modules.params import get_weight





dt = datetime.datetime.today();

data = {
    "journey_id":journey_id,
    "weight":get_weight(),
    "temperature":get_temp(),
    "dt":dt.strftime("%Y/%m/%d %H:%M:%S.%f")[:-3],
    "dt2":dt.strftime("%Y/%m/%d %H:%M:%S.%f")
}


print(data);

writeData(data,True);


#f = open(fl_path + fl_name,'a');


#print(f.read());

#f.close();

print(connection(host = 'https://www.google.com/'));


import threading

def printit():
  threading.Timer(5.0, printit).start()
  print ("Hello, World!")

printit()