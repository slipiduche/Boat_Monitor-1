import os,urllib,requests

url = "https://localhost:9443/upload-photos";

def connection(host = "https://www.google.com/"):
#{
    try:

        urllib.request.urlopen(host);
        
        return True;
    
    except Exception as e:

        print(e);

        return False;
#}

def sendFile(filepaths,dat):
#{
    global url;

    multipart_form_data = [];

    for filepath in filepaths:

        print(filepath);

        multipart_form_data.append(('fl',open(filepath,'rb')));

    #multipart_form_data = {
     #       'fl': (filename, open(filepath,'rb'))
      #  }

    try:

        if(connection()):

            response = requests.post(url, data = dat, files = multipart_form_data, verify= False);

            resp = response.json();

            print(resp);

            return resp;
        
        print("No connection to the Internet");

    except Exception as e:

        print(e);

    return None;
#}