#second integration work

import time

import modules.params as params;

import modules.loacation as location

import modules.network as network;

from modules.mqtts import Client


def wrange():

    location = params.get_location();

    if location:

        return  network.connection();
    
    return False;

client = Client();

location.airplane(False);

time.sleep(30);

if(wrange()):

    client.connect("localhost",3000);