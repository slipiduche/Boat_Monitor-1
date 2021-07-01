
import RPi.GPIO as GPIO

import statistics as stat

import time

from hx711 import HX711

vcc = 3.3; # HX711 ADC Power Source: V

gain = 128; # HX711 pre-ADC gain: dB

sensibility = 2; # Sensor Sensibility: mv/V

excitation = 12; # Exciteation Voltage: V

fullscale = sensibility * excitation;

maxvolt = gain * fullscale;

maxweight = 500;

maxval = (10**24) - 1;

mw = 500; # Max weight: Kg

def getWeight(samples):
#{
    global vcc, gain, fullscale, maxvolt, maxval, maxweight;

    weight = 0.0;

    raw = 0;

    t = time.perf_counter();

    try:     
        
        GPIO.setmode(GPIO.BCM);

        hx711 = HX711(
                        dout_pin=5,
                        pd_sck_pin=6,
                        channel='A',
                        gain = gain
                        );

        hx711.reset()   # Before we start, reset the HX711 (not obligate)
        
        raw  = round(stat.mean(hx711.get_raw_data(times = samples)));
    
    except Exception as e:

        print("Weith Measurement Exception: ");

        print(e);

    finally:

        GPIO.cleanup()  # always do a GPIO cleanup in your scripts!

    # testing is required for wiefht calculations
    
    # https://github.com/bogde/HX711/issues/70

    volts = raw*vcc/maxval;

    weight = volts*maxweight/maxvolt;

    time_elapsed = time.perf_counter() - t;

    print("Measured Weight: %s (Raw Data)" % hex(raw));
    
    print("Theoretical Voltage wtih gain: %f V" % volts);

    print("Theoretical Weight: %f KG" % weight);

    print("Samples: %d" % samples);
    
    print("Overall Measurment Time: %ds" % time_elapsed);

    return weight;
#}