const mqtt = require('mqtt');

const dusername = JSON.stringify({username:"orbittas@orbittas.com",storage:500});

const username = "orbittas@orbittas.com";

const opt =  {rejectUnauthorized : false, clientId: "BM-APP_e62fe62fw",username, password:"#B04tTr4ck3r++"};

//b8:27:eb:4f:15:95
const opt2 = {rejectUnauthorized : false, clientId: "BM-DEV_b8:27:eb:4f:15:97",username:dusername, password:"#B04tTr4ck3r++"};

const app = mqtt.connect("wss://localhost:5000",opt);

const device = mqtt.connect("mqtts://localhost:3000",opt2);

function multi_sub()
{

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

var token =  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoib3JiaXR0YXNAb3JiaXR0YXMuY29tIiwiaWQiOjEsImlhdCI6MTYyMjI0MzU0MiwiZXhwIjoxNjIyMjQ3MTQyfQ.z5AZANsx6zxbvnIx0n9hsxhEx0WLhf-q2DsylgxF5JI^1\""
device.on("connect",() => 
{
    console.log("o:");

    let message = JSON.stringify({token,id:1,CAT:"CAT!"});

    //app.subscribe("APP/e62fe62fw");

    //app.publish("BOAT/565454-fewo2345-fsf54",message);
});

device.on("error",(error) =>
{
    console.log(error);
});

app.on("connect",() => 
{
    console.log("o:");

    let message = JSON.stringify({token,id:1,CAT:"CAT!"});

    //app.subscribe("APP/e62fe62fw");

    app.publish("APP/END",message);
});

app.on("error",(error) =>
{
    console.log(error);
});