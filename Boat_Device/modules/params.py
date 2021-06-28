from logging import exception

from modules.one_wire import getTemp;

from modules.weight import getWeight;

from modules.IO import getStatus;


def get_temp():
#{
    try:

        return getTemp(30,0.001);
    
    except Exception as e:

        print(e);

    return None;
#}

def get_weight():
#{
    try:
        
        return getWeight(30);
    
    except Exception as e:

        print(e);

    return None;
#}

def get_status():
#{
    try:
        
        return getStatus();

    except Exception as e:

        print(e);

    return None;
#}

def get_location():
#{
    return True;
#}

def get_date():
#{
    return True;
#}

def get_time():
#{
    return True;
#}

def get_disk():
#{
    return True;
#}

