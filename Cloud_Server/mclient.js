const mqtt = require('mqtt');

const jwt = require('jsonwebtoken');

const dusername = JSON.stringify({username:"orbittas@orbittas.com",storage:500});

const username = "orbittas@orbittas.com";

const opt =  {rejectUnauthorized : false, clientId: "BM-APP_e62fe62fw",username, password:"#B04tTr4ck3r++"};

//b8:27:eb:4f:15:95
const opt2 = {rejectUnauthorized : false, clientId: "BM-DEV_b8:27:eb:4f:15:97",username:dusername, password:"#B04tTr4ck3r++"};

const mac = "b8:27:eb:4f:15:97";



const device = mqtt.connect("mqtts://localhost:3000",opt2);

const sub_tops = ["/START","/END","/CLEAR"];

var stoken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJib2F0X2lkIjoyLCJpZCI6MSwiaWF0IjoxNjIyNDg0Mjc1LCJleHAiOjE2MjM2OTM4NzV9.2Z68nCX5y19H7u410csKYQIMgNkq3FQ0hi0iiiMLBGs\"1>";

function appCon()
{
    const app = mqtt.connect("wss://localhost:5000",opt);

    app.on("connect",async () => 
    {
        console.log("o:");

        let message = JSON.stringify({token,id:2,CAT:"CAT!"});

        //app.subscribe("APP/e62fe62fw");
        
        let t = "APP/e62fe62fw";

        await app.subscribe(t);

        app.on("message", async (topic,payload,packet) =>
        {
            console.log(payload.toString());
        });

        app.publish("APP/END",message);
    });

    app.on("error",(error) =>
    {
        console.log(error);
    });
}
async function multi_sub(i,iter,topic,client)
{
    try
    {
        await client.subscribe(topic[i]);
        
        console.log("\n\rSubscribed to topic: ","DEVICE/" + mac + topic[i],"\n\r");

        i++;

        if(i != iter)
           await multi_sub(i,iter,topic,client)
    }
    catch(error)
    {
        console.log(error);
    }
}
/*device.subscribe("BM-DEV_b8:27:eb:4f:15:95/START",(error) =>
{
    console.log("BM-DEV_b8:27:eb:4f:15:95");

    if(error)
        console.log(error);
    else
    {
        console.log("subcribed to BM-DEV_b8:27:eb:4f:15:95/START");

        device.subscribe("BM-DEV_b8:27:eb:4f:15:95/START",(error) =>
        {
            console.log("");

            if(error)
                console.log(client,"BM-DEV_b8:27:eb:4f:15:95 error: \n\r\n\r",error);
            else
            {
                console.log("subcribed to BM-DEV_b8:27:eb:4f:15:95/START");

                
            }
        });
    }
});*/

var token =  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoib3JiaXR0YXNAb3JiaXR0YXMuY29tIiwiaWQiOjEsImlhdCI6MTYyMjQ4Mjg4MCwiZXhwIjoxNjIyNDg2NDgwfQ.VoUOu1f4S7bR0oUB_vOgaELbBtr2-7K6dRMz2pec3eM%1'";


async function readWeight()
{
    return 31.5;
}

device.on("connect", async () => 
{
    console.log("o:");

    //let message = JSON.stringify({token,id:1,CAT:"CAT!"});

    //app.subscribe("APP/e62fe62fw");

    //app.publish("BOAT/565454-fewo2345-fsf54",message);

    //await multi_sub(0,3,sub_tops,device);

    await device.subscribe("DEVICE/" + mac + "/END");

    device.on("message",async (topic,payload,packet) =>
    {
        let message;
        
        console.log(payload.toString());

        try
        {
            message = JSON.parse(payload.toString());
        }
        catch(error)
        {}

        if(message)
        {
            topic = topic.toString().split('/')[2];

            switch(topic)
            {
                case "START":
                {
                    let weight = await readWeight();

                    message.weight = weight;

                    stoken = message.token;          

                    if(stoken && weight)
                    {
                        let response =  JSON.stringify(message);

                        device.publish("DEVICE/" + mac + "/DEPARTURE",response);
                    }
                                  
                    break;
                }

                case "END":
                {
                    let weight = await readWeight();

                    message.weight = weight;

                    message.token = stoken;
                    
                    let response =  JSON.stringify(message);

                    device.publish("DEVICE/" + mac + "/ARRIVAL",response);
                    
                    break;
                }
            }
        }
    });

    
    appCon();   
});

device.on("error",(error) =>
{
    console.log(error);
});

