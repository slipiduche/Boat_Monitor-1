from gpiozero import PWMLED, Button;

from signal import pause;

import time;

pwm = PWMLED(7);

cont = Button(8);

def set_lid_sensor(container):
#{
    cont.when_activated = container(True);

    cont.when_deactivated = container(False);

    #pause();
#}

def light(cont_status):
#{
    t = time.localtime()[3];

    if((t > 18 or t < 6) and cont_status):

        pwm.value = 0.5;
    
    else:

        pwm.value = 0;    
#}