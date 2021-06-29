import paho.mqtt.client as mqtt

import uuid, re, json, os, ssl,threading

from modules.params import get_weight;

import modules.disk as disk;

dataLogs = "./logs/journey.json";

class Client:
    def __init__(self):
        #self.name: str = ':'.join(re.findall('..', '%012x' % uuid.getnode()))  # computer's mac address
        self.name: str = "BM-DEV_b8:27:eb:4f:15:77"
        self.mac: str = "b8:27:eb:4f:15:77";
        self.instance: mqtt.Client = mqtt.Client(self.name)
        self.journey: int = 0
        self.status: str = "";
        self.synced: bool = False;
        self.id: int = 0;
        self.token: str = None

    def _config(self):
        self.instance.on_connect = on_connect
        self.instance.on_message = on_message
        self.instance.on_disconnect = on_disconnect

    def connect(self, host: str, p: int):
        self.instance.tls_set(ca_certs= None, certfile=None,
                            keyfile=None, cert_reqs=ssl.CERT_NONE, #ssl.CERT_REQUIRED,
                            tls_version=ssl.PROTOCOL_TLSv1_2, ciphers=None)
        #self.instance.tls_set_context(context = None)
        self.instance.tls_insecure_set(True);
        self.instance.connect(host,port = p)
        self.instance.loop_start()

        self.instance.publish("CAT","HANGRY");
        
        self.instance.subscribe(f"DEVICE/{self.name}/START")
        self.instance.subscribe(f"DEVICE/{self.name}/END")
        self.instance.subscribe(f"DEVICE/{self.name}/CLEAR")

        self._config()

    def publish(self, topic: str, payload: str):
        self.instance.publish(f"DEVICE/{self.name}/{topic}", payload)


def on_message(client, userdata, message):
    
    data = json.loads(str(message.payload));

    topic = str(message.topic);

    processMessage(data,topic,client)


def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))


def on_disconnect():
    print("Disconnected from MQTT BROKER")


def saveData(client: Client, journey:int):
    
    global dataLogs;

    data = {"id":client.id,"journey":journey,"token":client.token,"status":"ongoing","synced":False};
    
    client.synced = False;

    client.status = "ongoing";

    client.journey = journey;
    
    f = open(dataLogs, "w");
    
    f.write(json.dumps(data));
    
    f.close();

def closureData(client: Client):
    
    global dataLogs;

    data = {"id":client.id,"journey":client.journey,"token":client.token,"status":"ended","synced":False};
    
    client.synced = False;

    client.status = "ended";
    
    f = open(dataLogs, "w");
    
    f.write(json.dumps(data));
    
    f.close();

def resetData(client: Client):
    
    data ={"id":0,"journey":0,"token":"","status":"","synced":True};
    
    client.synced = True;

    client.status = "";

    client.token = "";

    client.id = 0;

    client.journey = 0;
    
    f = open(dataLogs, "w");
    
    f.write(json.dumps(data));
    
    f.close();

def loadData(client: Client):
    
    f = open(dataLogs,"r");

    data = json.loads(str(f.read()));

    client.synced = data["synced"];

    client.status = data["status"];
    
    client.token = data["token"];

    client.id = data["id"];

    client.journey = data["journey"];

    f.close();

def clear(topic,response, client: Client, journey: int):

    deleted = disk.delDir(disk.getPath(journey));

    if deleted:

        response["deleted"] = 1;
    
    else:

        response["deleted"] = 0;

    client.publish(topic,json.dumps(response));


def processMessage(message: object, topic: str, client: Client):
    
    options = topic.split("/");

    if options.len == 3:

        response = {}

        x = options[2];

        user_id = None; obs = None;

        if "user_id" in message:
            
            user_id = message["user_id"];

        if "obs" in message:
        
            obs = message["obs"];

        if x == "START":

            start =  None;

            if "start" in message:
                
                start = message["start"];

            if start:

               

                if ("token" and "id" in message) and user_id:

                    token = message["token"];
                
                    id = message["id"];
                    
                    response["weight"] = get_weight();

                    response["user_id"] =  user_id;

                    response["token"] = token;
                    
                    response["obs"] = obs;

                    response["id"] =  id;

                    client.id = id;

                    client.token = token;

                    rt = "DEVICE/" + client.mac + "/DEPARTURE";

                    client.publish(rt,json.dumps(response));
            
            elif client.id and client.token:
                
                if "journey_id" in message:

                    journey = message["journey_id"];
                    
                    saveData(client,journey);


        elif x == "END":

            end = None;

            if "end" in message:
            
                end = message["end"];

            if end:

                response["weight"] = get_weight();

                response["token"]  = client.token;

                response["obs"] =  obs;

                response["id"] = client.id;

                response["user_id"] = user_id;

                rt = "DEVICE/" + client.mac + "/ARRIVAL";

                client.publish(rt,json.dumps(response));

        elif x == "CLEAR":

            delete = None;

            if "delete" in message:

                delete = message["delete"];

            if delete:
              
                if "journey" in message:

                    journey = message["journey"];

                    response = message;                
                    
                    response["proceed"] = 1;

                    rt = "DEVICE/" + client.mac + "/DELETION";

                    client.publish(rt,json.dumps(response));

                    t1 = threading.Thread(target = clear,args=(rt,response,client,journey,))

                    try:

                        t1.start();
                    
                    except Exception as e:

                        print(e);
