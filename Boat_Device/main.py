#second integration work

import time,json,threading;

import modules.file as file;

import modules.params as params;

import modules.location as location

import modules.network as network;

from modules.mqtts import Client

check = 60;

out = False;

prevLC = "?"; #used to check previous location and determine time in positin

cont_status = 1; #1: Closed; #0: Open This will change data sampling intervals; if the container is open intervals
#will be a random number between 30 and 60 seconds; if container is closed, data sampling will be every 5 to 15 mins

busy = False; #used so that some threads do not try to access the same resource simultanously


die = False;

fl = None;

def wrange(lc,x):

    ir = location.inRange(lc);
    
    if x >= 4 or ir:
    
        net = network.connection();
    
    if net and ir:

        return 3;
    
    elif net:

        return 2;
    
    elif ir:

        return 1;
    
    else:

        return 0;


def dataAcqusition():

    global busy;

    if not busy:

        busy = True;

        #Acquire Data and write to file


        busy = False;

t1 = threading.Timer(300,dataAcqusition,None);

client = Client();



if(wrange()):

    print("Internet Access!");

    print(client.connected);

    un = json.dumps({"storage":params.get_disk()["max_st"],"username":"orbittas@orbittas.com"});

    pw = "#B04tTr4ck3r++";

    client.connect("localhost",3000,un,pw);

    t = time.time();

    while not client.error and not client.connected:

        elapsed = t - time.time();

        if elapsed >= 60:

            print("Unable to stablish MQTTS connection");   

            client.instance.loop_stop();

            break;

    print(client.connected);
    
else:

    print("No Internet Access!");


x = 4;

t_upload = None;

while True:

    if x >= 4:
    
        location.airplane(False);

        print("Waiting for 10 seconds before verifying connection to the internet and location...");

        time.sleep(10);

    print("Confirming Internet Access and Location... ");

    lc = params.get_location();

    op = wrange(lc,x);

    if op == 3:

        print("Internet Access and Location Confirmed");

        if fl: 
            
            t_upload = threading.Thread(network.sendFile,(fl,{"token":client.token},));

            t_upload.start();

            fl = None;

        if not client.connected:
        
            client.connect();
        

        if client.status == "ended":

            out = False;

            t1.cancel();

        check = 60;

    elif op == 2:

        if fl:
            
            t_upload = threading.Thread(network.sendFile,(fl,{"token":client.token},));

            t_upload.start();
            
            fl = None;
        
        check = 900;

        if not out and client.status == "ongoing":

            t1.start();

            out = True;

    elif op == 1:

        check = 60;
    
    elif op == 0:

        check = 900;

        if not out and client.status == "ongoing":

            t1.start();

            out = True;
    

    time.sleep(check);

    if(not client.connected):
        
        x +=1;

        if x > 4:

            x = 0;

#https://support.google.com/maps/answer/18539?co=GENIE.Platform%3DDesktop&hl=en

#https://www.nhc.noaa.gov/gccalc.shtml

#https://www.kite.com/python/answers/how-to-find-the-distance-between-two-lat-long-coordinates-in-python

