import datetime

import json

import os

def genFile(journey_id,boat_id,fl):
#{
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

def writeData(data,last,journey_id,boat_id,fl):
#{
    try:

        path = genFile(journey_id,boat_id,fl);

        j = json.dumps(data);
    
        w = "";

        if exists(path):
            
            w = "," + j;

            if last:
                w += "]";

        else:
            w = "[" + j;
        
        file = open(path,'a');

        file.write(w);

        file.close();
    
        return True;

    except Exception as e:

        print(e);
    
        return False;
#}