const mqtt = require('mqtt');

const opt =  {rejectUnauthorized : false,username:"orbittas@orbittas.com",password:"#B04tTr4ck3r++"};

const client = mqtt.connect("wss://localhost:5000",opt);

client.on("connect",() => 
{
    console.log("o:");
    client.publish("Topo/1","CAT!");
});

client.on("error",(error) =>
{
    console.log(error);
});
