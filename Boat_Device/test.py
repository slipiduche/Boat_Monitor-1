import threading;

import signal;

import time;

import sys;

die = False;

def do_():

    prev = 0;

    s = 0;

    while True:

        t = time.time();

        te = t - prev;

        if(te >= 1):

            print(s);

            s += 1;

            prev = t;
        
        if die:
            break;

def do2():

    prev = 0;

    s = 0;

    while True:

        t = time.time();

        te = t - prev;

        if(te >= 1):

            print("cat");

            s += 1;

            prev = t;
        
        if die:
            break;

t1 = threading.Thread(target = do_);

t2 = threading.Thread(target = do2);

def signal_handler(sig, frame):
    
    global die;

    print('End of Porgram');

    die = True;

    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

print('Press Ctrl+C')

# signal.pause()

i = 0;

t1.start();

t2.start();


while True:

    i+= 1;

    if(i >= 1000):

        print("cat");

        i = 0;

    if die:

        break;

    time.sleep(1);