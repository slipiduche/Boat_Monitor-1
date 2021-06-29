
import RPi.GPIO as GPIO

from hx711 import HX711

vcc = 3.3; # HX711 ADC Power Source: V

gain = 64; # HX711 pre-ADC gain: dB

sensibility = 2; # Sensor Sensibility: mv/V

excitation = 12; # Exciteation Voltage: V

fullscale = sensibility * excitation;

mw = 500; # Max weight: Kg

GPIO.setmode(GPIO.BCM)

hx711 = HX711(
    dout_pin=5,
    pd_sck_pin=6,
    channel='A',
    gain=64
    )

def getWeight(samples):
#{
    global vcc, gain, fullscale, mw, hx711;

    weight = 0.0;

    raw = 0;

    try:     
        
        hx711.reset()   # Before we start, reset the HX711 (not obligate)
        
        raw  = hx711.get_raw_data(readings =samples);
   
    finally:

        GPIO.cleanup()  # always do a GPIO cleanup in your scripts!

    # testing is required for wiefht calculations
    
    # https://github.com/bogde/HX711/issues/70

    weight = raw;

    print("\n".join(weight));

    return weight;
#}