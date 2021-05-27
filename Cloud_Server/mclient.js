const mqtt = require('mqtt');

//const username = JSON.stringify({username:"orbittas@orbittas.com",storage:500});

const username = "orbittas@orbittas.com";

const opt =  {rejectUnauthorized : false, clientId: "BM-APP_e62fe62fw",username, password:"#B04tTr4ck3r++"};

const client = mqtt.connect("wss://localhost:5000",opt);

client.on("connect",() => 
{
    console.log("o:");

    let message = JSON.stringify({CAT:"CAT!"});

    client.publish("BOAT/565454-fewo2345-fsf54",message);
});

client.on("error",(error) =>
{
    console.log(error);
});
