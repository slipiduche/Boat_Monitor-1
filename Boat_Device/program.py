#New Puthon file
#!/usr/bin/python3
# from hx711 import HX711

# try:
#     hx711 = HX711(
#         dout_pin=5,
#         pd_sck_pin=6,
#         channel='A',
#         gain=64
#         )

#     hx711.reset()   # Before we start, reset the HX711 (not obligate)
#     measures = hx711.get_raw_data(num_measures=3)
# finally:
#     GPIO.cleanup()  # always do a GPIO cleanup in your scripts!

# print("\n".join(measures))


# import http.client
# import ssl
# import json

# conn = http.client.HTTPSConnection('localhost',8443,context = ssl._create_unverified_context())

# headers = {'Content-type': 'application/json'}

# foo = {'text': 'Hello HTTP #1 **cool**, and #1!'}
# json_data = json.dumps(foo)

# #conn.get('/kitty-pon',verify=False)

# conn.request('POST', '/kitty-pon', json_data, headers)

# response = conn.getresponse()


# print(json.loads(response.read().decode())["murp"])

import requests
import urllib3
import json

def my_function():
#{
    print("henlo")
#}

urllib3.disable_warnings()

url = "https://localhost:8443/upload-audio";

json_data = json.dumps({"CAT":"CAT"});

multipart_form_data = {
        'audio': ('m34.png', open('C:\\Users\\CLIM-DESKTOP\\Downloads\\m34.png','rb')),
        'temperature': ('', str(1)),
    }
response = requests.post(url, data = {"CAT":"CAT"},files = multipart_form_data, verify= False);

print(response.json());

my_function();


