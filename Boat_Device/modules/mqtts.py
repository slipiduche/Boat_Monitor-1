import paho.mqtt.client as mqtt

import uuid, re, json, os, ssl

from params import get_weight;


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


filePath = os.path.dirname(os.path.realpath(__file__))
logsPath = os.path.join(filePath, "..", "logs")

def deleteDir(journey: str):
    name = journey + ".json"
    path = os.path.join(logsPath, "journey", name)

    os.remove(path)

def saveData(client: Client, journey:int):
    
    data ={"id":client.id,"journey":journey,"token":client.token,"status":"ongoing","synced":False};
    
    client.synced = False;

    client.status = "ongoing";

    client.journey = journey;
    
    path = "./logs/journey.json";

    f = open(path, "w");
    
    f.write(json.dumps(data));
    
    f.close();


def resetData(client: Client):
    
    data ={"id":0,"journey":0,"token":"","status":"","synced":True};
    
    client.synced = True;

    client.status = "";

    client.token = "";

    client.id = 0;

    client.journey = 0;
    
    path = "./logs/journey.json";

    f = open(path, "w");
    
    f.write(json.dumps(data));
    
    f.close();

def loadData(x):
    
    x;


def processMessage(message: object, topic: str, client: Client):
    
    options = topic.split("/");

    if options.len == 3:

        response = {}

        x = options[2];

        id = message["id"];

        user_id = message["user_id"];
       
        if x == "START":

            start = message["start"];

            if start:

                token = message["token"];

                if token and id and user_id:

                    response["weight"] = get_weight();

                    response["user_id"] =  user_id;

                    response["token"] = token;

                    response["id"] =  id;

                    client.id = id;

                    client.token = token;

                    rt = "DEVICE/" + client.mac + "/DEPARTURE";

                    client.publish(rt,json.dumps(response));
            
            elif client.id and client.token:

                journey = message["journey_id"];
                
                if journey:

                    saveData(client,journey);


        elif x == "END":

            x;

        elif x == "CLEAR":

            x;

    if "start" in msg:
        if "journey_id" in msg and msg["journey_id"] != 0:
            if msg["start"] == 1:
                response["weight"] = msg["weight"]

                saveToken(msg["token"], msg["journey_id"])
                
                client.journey = msg.[]
                response["token"] = msg["token"]

                client.publish("DEPARTURE", json.dumps(response, indent=4))
                
            response["started"] = 1
            saveJourney(msg["journey_id"]) 
    
    elif "end" in msg and msg["end"] == 1:
        if "journey_id" in msg and msg["journey_id"] != 0:
            response["started"] = 0
            response["weight"] = getWeight()
            response["token"] = msg["token"]
            response["journey_id"] = msg["journey_id"]

            saveJourney(response)

            client.journey = 0 # end journey
            client.publish("END", json.dumps(response, indent=4))

    elif "delete" in msg and msg["delete"] == 1:
        if "journey_id" in msg and msg["journey_id"] != 0:
            if client.currentJourney != msg["journey_id"]:
                response["proceed"] = 1
                client.publish("DELETION", json.dumps(response, indent=4))

                deleteDir(str(msg["journey_id"]))

                response["deleted"] = 1
                client.publish("DELETION", json.dumps(response, indent=4))

