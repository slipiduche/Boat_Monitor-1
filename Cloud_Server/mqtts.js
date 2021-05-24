const aedes = require('aedes')();

const bcrypt = require('bcrypt');

const basicAuth = require('./modules/basic.js');

const SQL = require('./modules/sql.js');

async function appAuthorizer(username,password,signup)
{   
    let u = {username}, id = null, p = null, exists = false, error = false, sus = false, window = 0;
    let attempts = 0, data = null;

    let SUD = basicAuth.safeCompare(username,"SUD@orbittas.com") & !signup;

    let Q;
    
    if(!SUD)
        Q = await SQL.SEL("*",null,"USERS",u,null);
                    
    if(!Q.status && Q[0] && !SUD)
    {
        console.log("1. User Exists\n\r");

        if(Q[0].st && Q[0].approval == 1)
        {
            console.log("2. User Enabled\n\r");

            if(Q[0].pswrd && Q[0].id) 
            {
                console.log("3. Database Integrity OK\n\r");
                
                id = Q[0].id;

                console.log("4. User ID:" + id + "\n\r");

                if(Q[0].ldt)
                {
                    let str = Q[0].ldt;
                    
                    attempts = Q[0].latt;

                    let ldt = Date.parse(str), now = Date.now();

                    window = (now - ldt)/60000;


                    if(window <= 15 & attempts >= 10)
                    {
                        console.log("5. User Blocked\n\r");

                        sus = true;

                        data = {message:"Blocked User",status:"blocked", code:8};
                               
                        attempts++;

                        let dt = (new Date(now)).toISOString().replace(/T|Z/g,' ');

                        await SQL.UPD("USERS",{blocked:1,latt:attempts,ldt:dt},id)
                    }
                    else if(window > 15 & attempts)
                    {
                        let dt = (new Date(now)).toISOString().replace(/T|Z/g,' ');

                        await SQL.UPD("USERS",{blocked:0,latt:0,ldt:dt},id)
                    }
                    else
                    {
                        let dt = (new Date(now)).toISOString().replace(/T|Z/g,' ');

                        await SQL.UPD("USERS",{ldt:dt},id)
                    }              
                }
                else
                {
                    let now = Date.now();

                    let dt = (new Date(now)).toISOString().replace(/T|Z/g,' ');

                    await SQL.UPD("USERS",{ldt:dt},id) 
                }

                p = Q[0].pswrd;

                console.log("Hash: " + p);
                console.log("Input: " + password);
                
                exists = true;
            }           
        }
        else if(Q[0].approval == 0)
        {
            data = {message:"User pending for approval",status:"unavailable",code:6};
        }
        else if(!Q[0].st)
        {
            data = {message:"User is not enabled",status:"unavailable",code:6};
        }    
        else
        {
            data = {message:"User not registered",status:"unregistered",code:11};
        }    
    }
    else if (!Q[0])
        data = {message:"User not registered",status:"unregistered",code:11};
    else if(!SUD)
    {
        error = true;

        data = Q;
    }

    let passwordMatches = false;

    if(exists & !sus)
    {
        passwordMatches = await bcrypt.compare(password, p);

        process.stdout.write("5. Validation Complete. Result: ");

        console.log(passwordMatches);
    }
       

    if((exists | error) & passwordMatches & !sus)
    { 
        if(!error)
        {
            let id = Q[0].id, secret = Q[0].pswrd, usertype = Q[0].usertype;

            data = {id,secret,usertype};
        }          

        return [true,data];
    }     
    else
    {
        if((window <= 15) & (attempts < 10) & !passwordMatches & exists)
        {
            attempts++;

            await SQL.UPD("USERS",{latt:attempts},id) 
        }

        return [false,data];
    }
       
}

aedes.authenticate = async (client,username,password,callback) =>
{
    let access, data;

    [access,data] = await appAuthorizer(username,password,false);

    if(access)
        console.log(client.id," login attempt succeeded");
    else
        console.log(client.id," login attemtpt failed: ", data);
    
    callback(null, access);
}

const fs = require('fs');

var privateKey = fs.readFileSync('sslcert/domain.key', 'utf8');

var certificate = fs.readFileSync('sslcert/domain.crt', 'utf8');

var credentials = {key: privateKey, cert: certificate};

const broker = require('tls').createServer(credentials,aedes.handle);

const ws = require('websocket-stream');

const httpsServer = require('https').createServer(credentials);


broker.listen(3000, () =>
{
    console.log("MQTT BROKER (AEDES)");

    console.log('Aedes (MQTT netSocket) listening on port ', 3000);
});


/*WEBSOCKET SERVER*/

ws.createServer({ server: httpsServer }, aedes.handle);

httpsServer.listen(5000,  () =>
{
    console.log('Aedes (MQTT Web-socket) listening on port ' ,5000);
    aedes.publish({ topic: 'aedes/hello', payload: "I'm da broker " + aedes.id });
});


aedes.on('publish',(packet,client) =>
{
    if(client)
    {   
        console.log("Client: ",client.id);
        console.log("Topic: ",packet.topic);
        console.log("Message: ",packet.payload.toString());
   
    }

});