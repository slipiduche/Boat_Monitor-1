import time

from w1thermsensor import W1ThermSensor

sensor = W1ThermSensor();

def getTemp(samples,rate):
#{
    iter = 0;

    temp = 0.0;

    while(iter < samples):

        temp += sensor.get_temperature();

        iter += 1;

        time.sleep(rate);

    temp /= iter;

    print("Measured Temperature: %s Celsius" % temp);
    
    print("Samples: %d" % iter);
    
    print("Sample Rate: %dms" % rate);

    return temp;
#}

# Raspberry Pi config must be modified so that one wire communication is enabled:

# https://bigl.es/ds18b20-temperature-sensor-with-python-raspberry-pi/

# https://pinout.xyz/pinout/1_wire#:~:text=The%20Raspberry%20Pi%20supports%20one,dtoverlay%3Dw1%2Dgpio

# https://pypi.org/project/w1thermsensor/
