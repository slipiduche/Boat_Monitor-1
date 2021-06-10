#New Puthon file
#!/usr/bin/python3
# from hx711 import HX711

# try:
#     hx711 = HX711(
#         dout_pin=5,
#         pd_sck_pin=6,
#         channel='A',
#         gain=64
#         )

#     hx711.reset()   # Before we start, reset the HX711 (not obligate)
#     measures = hx711.get_raw_data(num_measures=3)
# finally:
#     GPIO.cleanup()  # always do a GPIO cleanup in your scripts!

# print("\n".join(measures))


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
import urllib
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

def get_temp():
#{
    return 7.7;
#}

def get_weight():
#{
    return 147.54;
#}

def get_status():
#{
    return True;
#}

def get_location():
#{
    return True;
#}

def connection(host = "https://www.google.com/"):
#{
    try:

        urllib.request.urlopen(host);
        
        return True;
    
    except Exception as e:

        print(e);

        return False;
#}

urllib3.disable_warnings()

url = "https://localhost:8443/kitty-pon";

json_data = json.dumps({"CAT":"CAT"});

multipart_form_data = {
        'audio': ('m34.png', open('C:\\Users\\CLIM-DESKTOP\\Downloads\\m34.png','rb')),
        'temperature': ('', str(1)),
    }

d = json.dumps({"CAT":"CAT"});

response = requests.post(url, data = d, verify= False);

print(response.json());

my_function();

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