import threading;

import signal;

import time;

import sys;

die = False;

def do_():

    prev = 0;

    s = 0;

    while True:

        t = time.time() - prev;

        if(t >= 20):

            print(s);

            s += 1;

            prev = t;
        
        if die:
            break;

t1 = threading.Thread(target = do_);

def signal_handler(sig, frame):

    print('End of Porgram');

    die = True;

    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

print('Press Ctrl+C')

# signal.pause()

i = 0;

t1.start();

while True:

    i+= 1;

    if(i >= 1000):

        print("cat");

        i = 0;

    if die:

        break;

    time.sleep(1);