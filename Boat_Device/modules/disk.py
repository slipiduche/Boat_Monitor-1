from os import listdir
from os.path import isfile, join, abspath

import shutil


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