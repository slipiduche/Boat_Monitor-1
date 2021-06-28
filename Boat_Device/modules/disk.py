from os import listdir
from os.path import isfile, join, abspath

import shutil

disk = "/";

def getDir(path):
#{
    try:
        
        abs = abspath(path);

        return abs;
    
    except Exception as e:
        
        print(e);
    
    return None;
#}

def getFiles(path):
#{
    try:

        filepaths = [path + f for f in listdir(path) if isfile(join(path, f))]
    
        print(filepaths);

        return filepaths;

    except Exception as e:

        print(e);

    return None;
#}

def delDir(path):
#{
    dir = getDir(path);

    if dir:
        
        try:
            
            shutil.rmtree(dir);

            print("%s successfully deleted" % dir);

            return True;
        
        except Exception as e:

            print(e);

            return None;
    else:

        print("%s is not a valid directory" % dir);

        return False;

#}

def getDisk(path = disk):
#{
    try:
    
        usage = shutil.disk_usage(path);

        print(usage);

        max_st = round(usage[0]/(1024**3),2);

        dsk =  round(usage[1]*100/usage[0],2);
    
        js = {"max_st":max_st, "dsk":dsk};

        print(js);

        return js;

    except Exception as e:

        print(e);

        return None;
#}

def getPath(journey):
#{
    return "./journeys/" + str(journey);
#}