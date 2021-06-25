import paho.mqtt.client as mqtt
import uuid, re, json, os, ssl


class Client:
    def __init__(self):
        #self.name: str = ':'.join(re.findall('..', '%012x' % uuid.getnode()))  # computer's mac address
        self.name: str = "BM-DEV_b8:27:eb:4f:15:77"
        self.instance: mqtt.Client = mqtt.Client(self.name)
        self.currentJourney: int = 0

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
    raw_data = str(message.payload.decode("utf-8"))
    #print("received message: ", raw_data)

    data = json.loads(raw_data)

    processMessage(data)


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

def saveJourney(journey: dict):
    name = str(journey["journey_id"]) + ".json"
    path = os.path.join(logsPath, "journey", name)

    f = open(path, "w")
    f.write(json.dumps(journey, indent=4))
    f.close()

def saveToken(token: str, journey: str):
    name = journey + ".json"
    path = os.path.join(logsPath, "token", name)

    f = open(path, "w")
    f.write("{\n\t\"token\": \"" + token + "\"\n}")
    f.close()

def getWeight():
    # I think I'll get this through some sensor reading
    return 0.0

def processMessage(msg: dict, client: Client):
    response = {}

    if "start" in msg:
        if "journey_id" in msg and msg["journey_id"] != 0:
            if msg["start"] == 1:
                response["weight"] = msg["weight"]

                saveToken(msg["token"], msg["journey_id"])
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

            client.currentJourney = 0 # end journey
            client.publish("END", json.dumps(response, indent=4))

    elif "delete" in msg and msg["delete"] == 1:
        if "journey_id" in msg and msg["journey_id"] != 0:
            if client.currentJourney != msg["journey_id"]:
                response["proceed"] = 1
                client.publish("DELETION", json.dumps(response, indent=4))

                deleteDir(str(msg["journey_id"]))

                response["deleted"] = 1
                client.publish("DELETION", json.dumps(response, indent=4))

