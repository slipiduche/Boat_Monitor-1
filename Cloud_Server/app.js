/*******************************************************************************
********************************************************************************
*                           BOAT MONITOR SERVER                                *
********************************************************************************
*******************************************************************************/


/**********************************MODULES*************************************/
const fs = require('fs');

const tls = require('tls');

const https = require('https');

const ws = require('websocket-stream');

const express = require('express');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

const nodemailer = require('nodemailer');

const fileUpload = require('express-fileupload');

const cors = require('cors');

const morgan = require('morgan');

const _ = require('lodash');

const pg = require('generate-password');

const basicAuth = require('./modules/basic.js');

const log = require('./modules/logging.js');

const handle = require('./modules/requests.js');

const SQL = require('./modules/sql.js');

const aedes = require('aedes')();

/*************************VARIABLES AND INSTANCES*****************************/

const port = [8443,9443,8883];

const mqtts_port = 3000, wss_port = 5000;

const FK =
{
  JOURNEYS:{USERS:["JOURNEYS.start_user","JOURNEYS.end_user"],BOATS:["JOURNEYS.boat_id"]}
}

const BOATS = ["id","boat_name","max_st","resp","resp_name","st","on_journey","lj","dt","obs"];

const USERS = ["id","username","names","mail","usertype","latt","ldt","blocked","st","approval","lva","dt"];

const bex = ["mac","max_st"];

const uex_self = ["username","names","mail","usertype","latt","ldt","blocked","st","approval","dt"];

const uex = ["latt","ldt","blocked","lva","dt"];

const uin = ["names"];

const bin = ["boat_name"]

const jex_INS = ["s_img","total_img","synced","um"];

const jex_UPD = ["s_img","total_img","synced","ug","alert","start_user","end_user"];

const jex_UPD2 = ["ini","ed","i_weight","f_weight","s_img","total_img","synced","ug","alert","boat_id","start_user","end_user"];

const jex_ini = ["ed","end_user","i_weight","f_weight","s_img","total_img","synced"];

const jex_ed = ["ini","start_user","i_weight","f_weight","s_img","total_img","synced"];

const C = ["USERS","JOURNEYS","PARAMS"];

const M = ["BOATS","USERS","JOURNEYS"];

const pi_macs = ["b8:27:eb:","dc:a6:32:","e4:5f:01:"];

var collector, app, broker, httpsServer = [];

var credentials; 

var creds  = false;

var test = true;

var testAccount = null;

var timers = {};

/*********************************PARAMETERS**********************************/
var transporter = null;

if(!test)
{
    transporter = nodemailer.createTransport(
    {
        host: "smtp.ethereal.email",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: 
        {
            user: "", // generated ethereal user
            pass: "", // generated ethereal password
        },
    });    
}
  
//Status Codes:
/*
1: Success
2: Empty
3: Unchanged
4: Failure
5: SQL Failure
6: Unavailable
7: Unauthorized
8: Blocked
9: Access Denied
10: Missing Data
11: Untregistered
12: Expired
13: undelivered
14: Communication error
15: queed
16: Unexisting resource
17: Invalid
*/
/*********************************FUNCTIONS***********************************/

async function resetQ()
{
    await SQL.UPD("BOATS",{queued:0});
}

function validateClient(id)
{
    if(id)
    {
        let res = id.toString().split('_');
        
        if(res[0] && res[1])
        {
            let output = [true];

            if(res[0] == "BM-DEV" || res[0] == "BM-APP")
            {
                if(res[0] == "BM-DEV")
                    res[1] = res[1].toLowerCase();

                return output.concat(res);
            }
                
        }
    }

    return [false,null,null];
}

function validateMAC(mac)
{
    if(mac)
    {
        let len = mac.length, sep = mac.match(/:/g).length;

        console.log(len); console.log(sep);

        if(len == 17 && sep == 5)
        {
            console.log("matched!");

            let prefix = mac.slice(0,9);

            console.log(prefix);

            for(let i = 0; i < pi_macs.length; i++)
            {
                if(prefix == pi_macs[i])
                    return true;
            }
        }
    }
    
    return false;
}

function getJoinParams(tab,retrieve,inner)
{
    let elements = retrieve.map((el) => tab + '.' + el)

    let values = inner[0], keys = Object.keys(values);
    
    let fields = inner[1], nicks = inner[2];

    let len = keys.length;
    
    let sum = 0;
    
    let join = "";

    for(let i = 0; i < len; i++)
    {    
        let n = values[keys[i]];
    
        for(let j = 0; j < n; j++)
        {
            let prefix = keys[i][0] + (j + 1).toString();
            
            let result = [];

            fields[j + sum].forEach((item,index) => 
            {
                result.push(prefix + "." + item + nicks[j + sum][index]); 
            });

            elements = elements.concat(result);

            join += "INNER JOIN " + keys[i] + " AS " + prefix + " ON " + FK[tab][keys[i]][j] + " = " + prefix +".id \n";
        }
                    
        sum += n;
    } 

    return [elements.join(),join]
}
async function filter(tab,retrieve,params,command,inner)
{
    let range = null, id = null,  rest = null, uid = null, last = false;
    
    process.stdout.write("check: ");
    
    console.log(params);

    if(params.auth)
        delete params.auth;

    if(params.data)
        delete params.data;

    if(params.tab)
        delete params.tab;

    if(params.csv)
        delete params.csv;
    
    if(params.id)
    {
        id = params.id;

        delete params.id;
    }
    
    if(params.rest)
    {
        rest = params.rest;
        
        delete params.rest;
    }

    if(params.last)
    {
        last = params.last;

        delete params.last;
    }

    if(params.token)
    {
        uid = params.token[params.token.length - 1];
    
        delete params.token;
    }

    if(params.ini && params.end)
    {
        range = [params.ini,params.end];

        delete params.ini;

        delete params.end;
    }
    
    process.stdout.write("Parameters: ");

    console.log(params);
    
    let Q  = [];

    switch(command)
    {
        case "SEL":
        {
            let where = null, join = null;
            let selection = "*";

            if(retrieve)
            {
                if(!inner)
                    selection = retrieve.join();
                else
                    [selection,join] = getJoinParams(tab,retrieve,inner)            
            }
            else if(inner)
            {
                [selection,join] = getJoinParams(tab,[selection],inner) 
            }
            

            if(Object.keys(params).length > 0)
                where = params;
           
            Q = await SQL.SEL(selection,rest,tab,where,range,last,join);

            break;
        }

        case "INS":
        {
            params = exclude(tab,command,params,id,uid);

            Q = await SQL.INS(tab,params);
            
            break;
        }

        case "UPD":
        {
            params = exclude(tab,command,params,id,uid);

            Q = await SQL.UPD(tab,params,id)
            
            break;
        }

        case "DEL":
        {
            Q = await SQL.DEL(tab,params);
            
            break;
        }
    }

    return Q;   
}

async function verify(req, min)
{
    let authorized = false, http_code = 500, status = null, code = null, message = null, usertype = null, id = null, mail = null, password = null;
    
    let boat_id = null;

    if ((req.body && req.body.token) || req.token)
    {
        let token;

        if(req.body)
            token = req.body.token;
        else
            token = req.token;

        if(token && token.length > 3)
        {
            [token,id] = NaNFinder(token);
            
            console.log("token");

            let Q = await SQL.SEL("*",null,"USERS",{id},null);

            if(!Q.status && Q[0])
            {
                password = Q[0].pswrd;

                try
                { 
                    let decoded =  jwt.verify(token,password);

                    if(!Q[0].st)
                    {
                        http_code = 403;
                        
                        status = "unavailable";
                        
                        code = 6;

                        message = "User is not enabled";
                    } 
                    else if(Q[0].blocked)
                    {
                        http_code = 403;
                        
                        status = "blocked";

                        code = 8;

                        message = "Blocked User";
                    } 
                    else if(!Q[0].approval)
                    {
                        http_code = 403;
                        
                        status = "unavailable";

                        code = 8;

                        message = "User pending for approval";
                    } 
                    else if(Q[0].approval == 2)
                    {
                        http_code = 403;
                        
                        status = "unavailable";

                        code = 8;

                        message = "Access denied";
                    } 
                    else if(Q[0].usertype < min)
                    {
                        http_code = 403;

                        status = "unauthorized";

                        code = 9;
                        
                        message = "Access Denied"; 
                    }  
                    else if(decoded.id != id)
                    {
                        http_code = 403;

                        status = "unauthorized";

                        code = 7;
                        
                        message = "Altered token";
                    }
                    else
                    {
                        code = 0;

                        usertype = Q[0].usertype;

                        mail = Q[0].mail;

                        boat_id = decoded.boat_id;

                        authorized = true; 
                    }
                    
                        
                }
                catch(error)
                {
                    console.log(error);

                    switch(error.name)
                    {
                        case "TokenExpiredError":
                        {
                            http_code = 401;

                            status = "unauthorized";
                           
                            code = 12;
                           
                            message = "Token expired"
                            
                            break;
                        }
                        
                        default:
                        {
                            http_code = 400;

                            status = "unauthorized";

                            code = 7;

                            message = "Bad Token";
                            
                            break;
                        }
                    }
                } 
            }
            else if (Q.status)
            {
                http_code = 500;
                
                status = "failure";
                
                code = 5;
                
                message = Q.message;
            } 
            else
            {
                http_code = 400;
                
                status = "unauthorized";
                
                code = 7;
                
                message = "Bad Token";
            }                           
        }        
    }
    else
    {
        http_code = 400;
        
        status = "unauthorized";

        code = 10;

        message = "Missing data";
    }

    if(!boat_id)
        return [authorized,http_code,status,code,message,usertype,id,mail,password];
    else
        return [authorized,http_code,status,code,message,usertype,id,mail,password,boat_id]; 
}

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

async function OPAuth(username,password,cb)
{
    let r, data;

    [r,data] = await appAuthorizer(username,password,false);

    return cb(null,r,data);

}

async function SUAuth(username,password,cb)
{
    let r, data;

    [r,data] = await appAuthorizer(username,password,true);

    return cb(null,r,data);
}

function unauthorized(req,data)
{
    process.stdout.write("Server Response: ");

    if(!data)
    {
        let resp;

        if(req.auth)
            resp = {message:"Invalid Username or Password",status:"unauthorized",code:7};
        else
            resp = {message:"Authentication parameters not prvided",status:"failure",code:4};
        
        console.log(resp);

        return resp;
    }
    else
    {
        console.log(data);
         
        return data;
    }
        
}

function removal(params,exclusions)
{
    let iter = exclusions.length;

    for(let i = 0 ; i < iter; i++)
    {
        if(params[exclusions[i]])
            delete params[exclusions[i]];
    }

    return params;
}

function exclude(tab,command,params,id,uid)
{
    switch(tab)
    {
        case "BOATS":
        {
            params = removal(params,bex);

            break;
        }

        case "USERS":
        {
            if(command == "UPD")
            {
                if(id == uid)
                    params = removal(params,uex_self);
                else
                    params = removal(params,uex);
            }

            break;
        }

        case "JOURNEYS":
        {
            
            if(command == "UPD")
            {
                if(params.forbid)
                {
                    params = removal(params,jex_UPD2);

                    delete params.forbid;
                }
                else
                    params = removal(params,jex_UPD);
            }
            else 
                params = removal(params,jex_INS);
            
            /*if(command == "INS")
                params = removal(params,jex_ini);
            else
                params = removal(params,jex_ed);
            */

            break;
        }
    }

    return params;
}

function data_access(tab,access)
{
    let iter = access.length;

    for(let i = 0; i < iter; i++)
    {
        if(tab == access[i])
            return true;
    }

    return false;
}

function gen(length)
{
    return pswrd = pg.generate(
    {
        length,
        numbers:true,
        symbols:true,
        uppercase:true,
        lowercase:true,
        strict:true
    });
}

function randomSymbol()
{
    let symbols = "!@#$%^&*()_-=+/*{}[]\"';,<>.?";

    return symbols[Math.floor(Math.random()*28)]
}

function isDigit(char)
{
    if(char >= '0' && char <= '9')
        return true;
    else
        return false;
}

function NaNFinder(str)
{
    if(str)
    {
        let pos = str.length - 2;

        let r = null;
    
        for(let i = pos; i > 0; i--)
        {
            if(!isDigit(str[i]))
            {
                r = i;
    
                break;
            }
        }
        if(r != null && r <= str.length - 3)
        {
            let id = str.slice(r + 1, str.length - 1);
   
            let token = str.slice(0,r);

            return [token,parseInt(id)];
        }
        else
            return [null,null];
    }
}

aedes.authenticate = async (client,info,password,callback) =>
{
    let access = false, data, device = null, username = null, max_st = null, val = true;
    console.log("Validating Client....");
    let cl = validateClient(client.id);

    let usertype = cl[1], mac = cl[2];

    console.log(mac);
    
    if(cl[0])
    {
        console.log("Client validated!");

        if(usertype == "BM-DEV")
        {
            try
            {
                device = JSON.parse(info);
    
                username = device.username;
                
                console.log(username);

                max_st = device.storage;
                
                console.log("Boat Systen.");
                
                val = validateMAC(mac);

                if (val)
                    console.log("Valid mac");
                else
                    console.log("Invalid mac");
                
            }
            catch(error)
            {
                console.log(error);

                username = info;
            }
        }
        else if(usertype == "BM-APP")
            username = info;

        console.log("\n\r");

        if(username && val)
            [access,data] = await appAuthorizer(username,password,false);
    }

    console.log("\n\r");
    
    callback(null, access & val);

    if(access && val)
    {
        console.log(client.id," login attempt succeeded\n\r\n\r");
        
        if(max_st)
        {
            let Q = await SQL.SEL("id,boat_name,connected",null,"BOATS",{mac});

            if(!Q.status)
            {
                if(Q[0])
                {
                    let id = Q[0].id, connected = Q[0].connected, boat_name = Q[0].boat_name;

                    if(id && !connected)
                    {
                        await SQL.UPD("BOATS",{connected:1,max_st},id);

                        console.log("\n\rBoat ",id,", ", boat_name, "is now connected\n\r\n\r");
                    }
                    else if(!id)
                    {
                        console.log("\n\rUnable to change Boat ",id," database fields\n\r\n\r");
                    }
                }
                else
                {
                    let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 
            
                    let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
        
                    let params =
                    {
                        mac,
                        max_st,
                        connected:1,
                        st:0,
                        dt
                    }
                    
                    await SQL.INS("BOATS",params);  
                }
            }
        }  
    }     
    else
        console.log(client.id," login attemtpt failed: ", data);
    
}

/*******************************INITIALIZATION********************************/

setImmediate(async() =>
{

try
{
    let privateKey = fs.readFileSync('sslcert/domain.key', 'utf8');

    let certificate = fs.readFileSync('sslcert/domain.crt', 'utf8');
    
    credentials = {key: privateKey, cert: certificate};

    creds = true;
}
catch(error)
{
    log.errorLog("creds","Unable to get Key and Ceritficate.\n\r\n\r" + error.toString(),1);
}

try
{
    if(test)
    {
        testAccount = await nodemailer.createTestAccount();

        console.log("Nodemailer Test Account successfully created");

        console.log(testAccount);

        transporter = nodemailer.createTransport(
        {
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: 
            {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
        
    }
        

}
catch(error)
{
    log.errorLog("creds","Unable to create mail test account.\n\r\n\r" + error.toString(),1);
}

if(creds)
{
    collector = express();
    
    collector.use(fileUpload(
    {
        createParentPath: true
    }));
        
    collector.use(cors());
    
    collector.use(express.json());
    
    collector.use(express.urlencoded());
    
    collector.use(morgan('dev'));

    var auth = basicAuth(
    {
        authorizer: OPAuth,
        authorizeAsync: true,
        unauthorizedResponse: unauthorized
    });

    var sup = basicAuth(
    {
        authorizer: SUAuth,
        authorizeAsync: true,
        unauthorizedResponse: unauthorized
    });
    
    app = express();

    app.use(express.json());
    
    app.use(express.urlencoded());
        
    httpsServer[0] = https.createServer(credentials, collector);

    httpsServer[1] = https.createServer(credentials, app);

    httpsServer[2] = https.createServer(credentials);

    broker = tls.createServer(credentials,aedes.handle);

    ws.createServer({ server: httpsServer[2] },aedes.handle);
    
    await resetQ();

    httpsServer[0].listen(port[0], (error) =>
    {
        if(error)
            log.errorLog("",error,1); //error10
        else
            console.log("Collector is listening on port " + port[0] + ".")
    });

    httpsServer[1].listen(port[1], (error) =>
    {
        if(error)
            log.errorLog("",error,1); //error10
        else
            console.log("App is listening on port " + port[1] + ".")
    });

    httpsServer[2].listen(wss_port, (error) =>
    {   
        if(error)
            log.errorLog("",error,1); //error10
        else
            console.log("Aedes MQTT over wss communication established on port " + wss_port + ".")
    });


    broker.listen(mqtts_port, () =>
    {
        console.log('Aedes (MQTTS netSocket) listening on port ', 3000);
    });

    /************************************************************************ */
    collector.post("/process", (req,res) =>
    {
        let ok = false, filenames = [], status = {},code;

        [ok,filenames,status,code] = handle.uploads(res,req);

        if(ok)
            [status,code] = handle.data(res,req,filenames);
        
        res.status(code).send(status);         
    });

    /**********************************************************************/

    /*Authentication and Recovery*/

    app.get("/login", auth, async (req,res) =>
    {
        let user = req.auth.user, id = null, secret = null, usertype = null, token = null;
        
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        try
        {
            if(!req.data.status)
            {
                id = req.data.id; secret = req.data.secret; usertype = req.data.usertype;

                console.log();
                
                console.log({id,secret,usertype});

                if(id && secret && usertype)
                {
                    let s1 = randomSymbol(), s2 = randomSymbol();

                    token = jwt.sign({user,id},secret,{expiresIn:60*60}) + s1 + id.toString() +  s2;

                    console.log("\n\rToken: " + token + "\n\r");

                    if(token)
                        handle.response(res,200,{token,usertype,message:"Login Successful",status:"success",code:1});
                    else
                        handle.response(res,500,{message:"Unknown Error",status:"failure",code:4});
                }              
                else
                    handle.response(res,500,{message:"Database Integrity Issue; Null Values",status:"failure",code:4});

            }
            else
                handle.response(res,500,req.data);
 
        }
        catch(error)
        {
            handle.response(res,500,{message:error.toString(),status:"failure",code:4});
        }

    });

    app.get("/recovery", sup, async (req,res) => 
    {
        let params = req.body;

        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        let mail = params.mail;

        let W = await SQL.SEL("*",null,"USERS",{mail},null);

        if(!W.status)
        {
            if(W[0])
            {
                if(W[0].mail && W[0].username && W[0].st)
                {
                    let username = W[0].username, mail = W[0].mail, password = gen(16);

                    let pswrd = await bcrypt.hash(password,10);
                    
                    let Q = await SQL.UPD("USERS",{pswrd},W[0].id);        

                    if(!Q.status)
                    {
                        try
                        {   
                            handle.mailing({username,mail,password},false,transporter);

                            handle.response(res,200,{message:"An email containing new credentials was sent",status:"success",code:1});
                        }
                        catch(error)
                        {
                            log.errorLog("mail",error.toString(),1);

                            handle.response(res,500,{message:"Unable to send email",status:"failure",code:4});
                        }
                    }
                    else
                        handle.response(res,500,Q);

                }
                else if(W[0].st == false)
                    handle.response(res,403,{message:"User is not enabled",status:"unavailable",code:6});
                else
                    handle.response(res,500,{message:"Database Integrity Issue",status:"failure",code:4});
            }
            else
            {
                handle.response(res,403,{message:"No user is registered with this email address",status:"failure",code:4});
            }
        }
        else
            handle.response(res,500,W);
    });

    /*Data Visualization*/

    app.get("/boats", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret,  body = req.body;

        if(body)
            body = Object.keys(body).length;
            
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] = await verify(req,1);

            if(authorized)
            {
                let csv = req.body.csv;
                
                let Q = await filter("BOATS",BOATS,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        if(!csv)
                            handle.response(res,200,{BOATS:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"BOATS",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url,message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                }   
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }         
                    else
                        handle.response(res,200,{BOATS:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q); 
            }
            else
                handle.response(res,http_code,{message,status,code}); 
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});       
    });

    app.get("/users", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret, body = req.body;

        if(body)
            body = Object.keys(body).length;
            
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] =  await verify(req,1);

            if(authorized)
            {   
                req.body.rest = usertype;
                
                let csv = req.body.csv;

                let Q = await filter("USERS",USERS,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {               
                        if(!csv)
                            handle.response(res,200,{USERS:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"USERS",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url, message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                }
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }
                    else
                        handle.response(res,200,{USERS:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q); 
            }
            else
                handle.response(res,http_code,{message,status,code}); 
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});

        
    });

    app.get("/journeys", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret, body = req.body;

        if(body)
            body = Object.keys(body).length;

        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] =  await verify(req,1);
      
            if(authorized)
            {
                let csv = req.body.csv;

                let inner =
                [
                    {USERS:2,BOATS:1},
                    [uin,uin,bin],
                    [[" start_user_names"],[" end_user_names"],[""]]
                ];

                let Q = await filter("JOURNEYS",null,req.body,"SEL",inner);
                
                if(!Q.status)
                {
                    if(Q[0])
                    {       
                        if(!csv)
                            handle.response(res,200,{JOURNEYS:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"TRAVELS",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url, message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                }  
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }
                    else
                        handle.response(res,200,{JOURNEYS:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q); 
            }
            else
                handle.response(res,http_code,{message,status,code}); 
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});
  
    });

    app.get("/files", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret, body = req.body;

        if(body)
            body = Object.keys(body).length

        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] =  await verify(req,1);

            if(authorized)
            {
                let csv = req.body.csv;

                let Q = await filter("FILES",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        if(!csv)
                            handle.response(res,200,{FILES:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"FILES",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url, message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                }  
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }
                    else
                        handle.response(res,200,{FILES:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q); 
            }
            else
                handle.response(res,http_code,{message,status,code});   
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});
    });

    app.get("/historics", async (req,res) =>
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret, body = req.body;

        if(body)
            body = Object.keys(body).length;
            
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] = await verify(req,1);
            
            if(authorized)
            {
                let csv = req.body.csv;

                let Q = await filter("HISTORICS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        if(!csv)
                            handle.response(res,200,{HISTORICS:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"HISTORICS",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url, message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                }  
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }
                    else
                        handle.response(res,200,{HISTORICS:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q);
            }
            else
                handle.response(res,http_code,{message,status,code}); 
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});
    }); 

    app.get("/alerts", async (req,res) =>
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret,  body = req.body;

        if(body)
            body = Object.keys(body).length;
            
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,secret] = await verify(req,1);

            if(authorized)
            {
                let csv = req.body.csv;

                let Q = await filter("ALERTS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        if(!csv)
                            handle.response(res,200,{ALERTS:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"ALERTS",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url, message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                }
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }
                    else
                        handle.response(res,200,{ALERTS:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q);
            }
            else
                handle.response(res,http_code,{message,status,code});
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});    
    }); 

    app.get("/params", async (req,res) =>
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret,  body = req.body;

        if(body)
            body = Object.keys(body).length;
            
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] = await verify(req,2);

            if(authorized)
            {
                let csv = req.body.csv;

                let Q = await filter("PARAMS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        if(!csv)
                            handle.response(res,200,{PARAMS:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"PARAMS",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url, message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                }
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }
                    else
                        handle.response(res,200,{PARAMS:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q);
            }
            else
                handle.response(res,http_code,{message,status,code});
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});    
    }); 


    app.get("/requests", async (req,res) =>
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret, body = req.body;

        if(body)
            body = Object.keys(body).length;
            
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] = await verify(req,2);

            if(authorized)
            {
                let csv = req.body.csv;

                let Q = await filter("REQUESTS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {       
                        if(!csv)
                            handle.response(res,200,{REQUESTS:Q,message:"List successfully retrieved",status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = await handle.data2CSV(id,req.get("host"),"REQUESTS",Q);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({mail,url},true,transporter);

                                    let resp = {url,message:"CSV Generated and sent. URL valid for 24 hours only",status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {url, message:"Unable to send mail, but URL generated. Valid for 24 hours only",status:"undelivered",code:13};

                                    handle.response(res,500,resp);
                                } 
                            }
                            else
                            {
                                handle.response(res,500,url);
                            }
                        }
                    }
                    else
                        handle.response(res,200,{ALERTS:[],message:"No Results",status:"empty",code:2});
                }     
                else
                    handle.response(res,500,Q);
            }
            else
                handle.response(res,http_code,{message,status,code});
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});    
    }); 

    app.get("/files/zip", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] = await verify(req,1);

            let journey_id = req.body.journey_id;

            if(authorized)
            {
                if(journey_id)
                {
                    let host = req.get("host"), zip, resp;
                    
                    [zip,resp] = await handle.zipTravel(res,host,id,mail,transporter,journey_id);

                    if(!zip && resp)
                        handle.response(res,500,resp);
                }
                else
                    handle.response(res,400,{message:"No travel specified",status:"failure",code:10})
               
            }
            else
                handle.response(res,http_code,{message,status,code});
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});    
    });

    app.get("/files/:type/:file", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id, mail, secret, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id,mail,secret] = await verify(req,1);

            if(authorized)
                handle.downloads(req,res);
            else
                handle.response(res,http_code,{message,status,code});
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});    
    });

    app.get("/dl/:token", async (req,res) =>
    {
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        handle.downloads(req,res);

    });

    app.post("/signup", sup, async (req,res) => //add approval
    {
        let params = req.body;

        let body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            let username = params.username;

            let W = await SQL.SEL("*",null,"USERS",{username},null);

            if(!W.status)
            {
                if(W[0])
                {
                    if(W[0].username)
                    {
                        if(W[0].approval == 2 && !W[0].blocked)
                        {
                            params.usertype = 4;    params.approval = 0; params.id = W[0].id;
        
                            params.pswrd = await bcrypt.hash(params.pswrd,10);
            
                            console.log("hashing complete");
                            
                            let Q = await filter("USERS",null,params,"UPD"); 
                    
                            if(!Q.status)
                            {
                                handle.response(res,200,{message:"User Created",status:"success",code:1});
                            }     
                            else
                                handle.response(res,500,Q);       
                        }
                        else
                            handle.response(res,403,{message:"User Already Exists",status:"unchanged",code:3});
                    }
                    else
                        handle.response(res,500,{message:"Database Integrity Issue",status:"failure",code:4});
                }
                else
                {
                    let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 
    
                    let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
            
                    params.usertype = 4; params.latt = 0; params.st = 0; params.blocked = 0; params.dt = dt;
                    
                    params.approval = 0;

                    params.pswrd = await bcrypt.hash(params.pswrd,10);
    
                    console.log("hashing complete");
                    
                    let Q = await filter("USERS",null,params,"INS"); 
            
                    if(!Q.status)
                    {
                        handle.response(res,200,{message:"User Created",status:"success",code:1});
                    }     
                    else
                        handle.response(res,500,Q);           
                }
            }
            else
                handle.response(res,500,W);
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});
    });
    
    app.post("/journeys/start", async (req,res) =>
    {
        let authorized = false, access, http_code, status, code, message, secret, min = 1;
        
        let id, mail, usertype, body = Object.keys(req.body).length;
        
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            let aux;

            [authorized,http_code,status,code,message,aux,id,mail,secret] =  await verify(req,min);

            console.log({authorized,http_code,status,code,message}); console.log();
        }
        else
            [http_code,status,code,message] = [400,"failure",4,"No Body"];
        
       
        if(authorized)
        {
            if(req.body.boat_id)
            {
                let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

                let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
                
                let obs = null;

                if(req.body.obs)
                    obs = req.body.obs;
                
                let params = 
                {
                    ini: dt,
                    start_user: id,
                    boat_id: req.body.boat_id,
                    i_weight: /* get weight */ 47.5,
                    s_img: 0,
                    total_img: 0,
                    synced: 0,
                    obs,
                    alert:0
                }
            
                let Q = await SQL.PROC("bm_JOURNEYS_ST",params); 

                if(!Q.status)
                {
                    handle.response(res,200,{message:"New Travel Started",status:"success",code:1});
                }     
                else
                    handle.response(res,500,Q);
            }
            else
                handle.response(res,400,{message:"Missing parameters",status:"unchanged",code:10});   
            
         }
         else
            handle.response(res,http_code,{message,status,code}); 
   
    });

    app.post("/journeys/end", async (req,res) =>
    {
        let authorized = false, access, http_code, status, code, message, secret, min = 1;
        
        let id, mail, usertype, body = Object.keys(req.body).length;
        
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            let aux;

            [authorized,http_code,status,code,message,aux,id,mail,secret] =  await verify(req,min);

            console.log({authorized,http_code,status,code,message}); console.log();
        }
        else
            [http_code,status,code,message] = [400,"failure",4,"No Body"];
        
       
        if(authorized)
        {
            if(req.body.id)
            {
                let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

                let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
                
                let obs = null;

                if(req.body.obs)
                    obs = req.body.obs;
                
                let params = 
                {
                    id: req.body.id,
                    ed: dt,
                    f_weight: /* get weight */ 321.5,
                    obs
                }

                let Q = await SQL.PROC("bm_JOURNEYS_ED",params); 

                if(!Q.status)
                {
                    handle.response(res,200,{message:"Travel Ended",status:"success",code:1});
                }     
                else
                    handle.response(res,500,Q);
            }
            else
                handle.response(res,400,{message:"Missing parameters",status:"unchanged",code:10});   
            
         }
         else
            handle.response(res,http_code,{message,status,code}); 
   
    });

    app.post("/create", async (req,res) => 
    {
        let authorized = false, access, http_code, status, code, message, min = 2;
        
        let id, mail, usertype, body = Object.keys(req.body).length;
        
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            usertype = req.body.usertype;
    
            if(usertype)
                min = usertype + 1;
    
            access = data_access(req.body.tab,C);

            if(access)
            {
                let aux; 

                [authorized,http_code,status,code,message,aux,id,mail,aux] =  await verify(req,min);

                console.log({authorized,http_code,status,code,message}); console.log();
            }
            else
            {
                [http_code,status,code,message] = [400,"unchanged",3,"unavailable resource"];
            }
        }
        else
            [http_code,status,code,message] = [400,"failure",4,"No Body"];
        
       
        if(authorized)
        {
            let params = req.body, proceed = true;

            if(params.tab == "USERS")
            {
                let W = await SQL.SEL("*",null,"USERS",{id:params.id},null);

                if(!W.status)
                {
                    if(W[0])
                    {
                        proceed = false; 

                        if(W[0].username)
                        {   
                            handle.response(res,403,{message:"User Already Exists",status:"unchanged",code:3});
                        }
                        else
                            handle.response(res,500,{message:"Database Integrity Issue",status:"failure",code:4});
                    }
                }
                else
                {
                    handle.response(res,500,W);

                    proceed = false;
                }
            }

            if(proceed)
            {
                if(params.tab == "USERS" || params.tab == "PARAMS")
                {
                    let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 
    
                    let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
                    
                    params.dt = dt;

                    if(params.tab == "USERS")
                    {
                        params.blocked = 0;

                        params.latt = 0;
    
                        params.lva = null;
    
                        params.ldt = null;

                        params.alert = 0;
    
                        if(params.pswrd)
                        {
                            params.pswrd = await bcrypt.hash(params.pswrd,10);
        
                            console.log("hashing complete");    
                        } 
                    }
                    else
                        params.user_id = id;                 
                }
                else if(params.tab == "JOURNEYS")
                {
                    params.s_img = 0;

                    params.total_img = 0;

                    params.synced = 0;

                    params.ug = id;
                }
               
                let Q = await filter(params.tab,null,params,"INS"); 
    
                if(!Q.status)
                {
                    handle.response(res,200,{message:"New entry successfully created",status:"success",code:1});
                }     
                else
                    handle.response(res,500,Q);
            }
  
        }
        else
            handle.response(res,http_code,{message,status,code});       
    });

    app.post("/modify", async (req,res) => 
    {
        let authorized = false, access = false, http_code, status, code, message, min = 1;

        let usertype, id, body = Object.keys(req.body).length, params;
        
        console.log(); process.stdout.write(req.get("host")); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            usertype = req.body.usertype;
            
            if(req.body.token)
            {
                let aux;

                [aux,id] = NaNFinder(req.body.token)
            }
               

            if(usertype && req.body.id != id)
                min = usertype + 1;
            else if(!usertype)
                min = 2;
        
            access = data_access(req.body.tab,M);

            if(access)
            {
                params = req.body;

                let aux, aux1, aux2;

                if(params.id)
                    [authorized,http_code,status,code,message,aux,aux1,aux2] =  await verify(req,min);
                else
                    [http_code,status,code,message] = [400,"unchanged",10,"Missing parameters"];

                console.log({authorized,http_code,status,code,message}); console.log();
            }
            else
            {
                [http_code,status,code,message] = [400,"unchanged",3,"unavailable resource"];
            }
        }
        else
            [http_code,status,code,message] = [400,"failure",4,"No Body"];

        if(authorized)
        {  
            let proceed = true;

            if(params.tab == "JOURNEYS")
            {
                let W = await SQL.SEL("ug,um",null,"JOURNEYS",{id});
                
                if(W[0])
                {
                    if(W[0].um)
                        params.um = W[0].um + ',' + id.toString();
                    else
                        params.um = id.toString();

                    if(!W[0].ug)
                        params.forbid = true;
                }
                else
                {
                    handle.response(res,404,{message:"Travel does not exists",status:"unchamged",code:3});

                    proceed = false;
                }                
                
            }

            if(proceed)
            {
                if(params.pswrd)
                {
                    params.pswrd = await bcrypt.hash(params.pswrd,10);
    
                    console.log("hashing complete");    
                }
    
                let Q = await filter(params.tab,null,params,"UPD"); 
    
                if(!Q.status)
                {
                    handle.response(res,200,{message:"Entry successfully modified",status:"success",code:1});
                }     
                else
                {
                    if(Q.code == 3)
                        handle.response(res,400,Q);
                    else 
                        handle.response(res,500,Q);
                }           
            }
           
        }
        else
            handle.response(res,http_code,{message,status,code});       
    });
}

/*****************************************MQTT**********************************************/


aedes.on('publish', async (packet,client) =>
{
    if(client)
    { 
        let topic = null, message = null, data = null;
        
        let cl = client.id.toString().split('_'), outgoing = "APP/" + cl[1];

        try
        {
            topic = packet.topic;
            
            message = packet.payload.toString();
            
            data = JSON.parse(message);
        }
        catch(error) 
        { 
            console.log("Erroneous INPUT DATA: ",data);

            console.log(error);
        }

        if(data)
        {
            console.log("Client: ",client.id);
            console.log("Topic: ",topic);
            console.log("Message: ",data);

            let authorized,http_code,status,code,message,usertype,user_id,mail,secret, min = 1, b;

            if(topic == "APP/CLEAR")
                min = 2;

            [authorized,http_code,status,code,message,usertype,user_id,mail,secret,b] = await verify(data,min);

            if(authorized)
            {
                let aux = topic.toString().split('/');
                
                let device = "DEVICE/";

                if(aux[0] != "DEVICE" && cl[0] == "BM-APP")
                {
                    if(data.id)
                    {
                        let Q;

                        if(min < 2)
                            Q = await SQL.SEL("*",null,"BOATS",{id:data.id});
                        else
                            Q = await SQL.SEL("*",null,"JOURNEYS",{id:data.id}); //need to join data

                        if(Q[0])
                        {
                            let id = Q[0].id, mac = Q[0].mac, queued = Q[0].queued, boat_name = Q[0].boat_name;

                            let on_journey = Q[0].on_journey, connected = Q[0].connected, obs = Q[0].obs;

                            let st = Q[0].st;

                            if(data.obs)
                            {
                                if(obs)
                                    obs += " / " + data.obs;
                                else
                                    obs = data.obs;
                            }
                                
                            if(!queued && connected)
                            {
                                switch(aux[1])
                                {
                                    case "START":
                                    {
                                        if(!on_journey && st)
                                        {
                                            let U = await SQL.UPD("BOATS",{queued:1},id);
                                        
                                            if(U && !U.status)
                                            {
                                                let message, status, code, stc;
                                                
                                                device += mac + "/START";
    
                                                try
                                                {
                                                    timers[id.toString()] = setTimeout(async () =>
                                                    {
                                                        await SQL.UPD("BOATS",{queued:0},id);
                                                        
                                                        stc = 500;
    
                                                        message = "No response from Boat " + id;
                                                        
                                                        status = "failure", code = "14";

                                                        let response = {id,boat_name,message,status,code};

                                                        handle.response(aedes,stc,response,outgoing);  
    
                                                    }, 7000);
                                                    
                                                    let s1 = randomSymbol(), s2 = randomSymbol();

                                                    let token = jwt.sign({boat_id:id,id:user_id},secret,{expiresIn:60*60*24*14}) + s1 + user_id.toString() +  s2;
                                                    
                                                    handle.response(aedes,200,{token,id,user_id,obs,start:1},device);    
    
                                                    message = "Boat " + id + "," + boat_name + "'s departure queued";
                                                
                                                    status = "queued", code = "15"; stc = 200;
                                                }
                                                catch(error)
                                                {
                                                    console.log(error);
    
                                                    stc = 500;
    
                                                    message = "Aedes error."; status = "failure"; code = "14";

                                                    let  response = {message,status,code};

                                                    try
                                                    {
                                                        handle.response(aedes,stc,response,outgoing);   
                                                    }
                                                    catch(error)
                                                    {
                                                        console.log(error);
                                                    }
                                                }
    
                                                let response = {message,status,code};

                                                console.log(response,"\n\rStatus Code: ",stc); 
                                             
                                            }
                                        }
                                        else if(on_journey)
                                        {
                                            let message = "Boat " + id + ", " + boat_name + " already traveling";

                                            let status = "unchanged", code = 3, stc = 200;

                                            let response = {id,boat_name,message,status,code};

                                            try
                                            {
                                                handle.response(aedes,stc,response,outgoing);   
                                            }
                                            catch(error)
                                            {
                                                console.log(error);
                                            }
                                        }
                                        else
                                        {
                                            let message = "Boat " + id + ", " + boat_name + " not cleared for departures";

                                            let status = "unchanged", code = 3, stc = 200;

                                            let response = {id,boat_name,message,status,code};

                                            try
                                            {
                                                handle.response(aedes,stc,response,outgoing);   
                                            }
                                            catch(error)
                                            {
                                                console.log(error);
                                            }
                                        }

                                        break;
                                    }
            
                                    case "END":
                                    {
                                        if(on_journey)
                                        {
                                            let U = await SQL.UPD("BOATS",{queued:1},id);
                                        
                                            if(U && !U.status)
                                            {
                                                let message, status, code, stc;
                                                
                                                device += mac + "/END";
    
                                                try
                                                {
                                                    timers[id.toString()] = setTimeout(async () =>
                                                    {
                                                        await SQL.UPD("BOATS",{queued:0},id);
                                                        
                                                        stc = 500;
    
                                                        message = "No response from Boat " + id;
                                                        
                                                        status = "failure", code = "14";

                                                        let response = {id,boat_name,message,status,code};

                                                        handle.response(aedes,stc,response,outgoing);  
    
                                                    }, 7000);
                                                    
                                                    handle.response(aedes,200,{id,user_id,obs,end:1},device);    
    
                                                    message = "Boat " + id + "," + boat_name + "'s arrival queued";
                                                
                                                    status = "queued", code = "15"; stc = 200;
                                                    
                                                }
                                                catch(error)
                                                {
                                                    console.log(error);
    
                                                    stc = 500;
    
                                                    message = "Aedes error."; status = "failure"; code = "14";

                                                    let response = {message,status,code};

                                                    try
                                                    {
                                                        handle.response(aedes,stc,response,outgoing);   
                                                    }
                                                    catch(error)
                                                    {
                                                        console.log(error);
                                                    }
                                                }
    
                                                let response = {message,status,code};

                                                console.log(response,"\n\rStatus Code: ",stc); 
                                             
                                            }
                                        }
                                        else
                                        {
                                            let message = "Boat " + id + ", " + boat_name + " isn't traveling";

                                            let status = "unchanged", code = 3, stc = 200;

                                            let response = {id,boat_name,message,status,code};

                                            try
                                            {
                                                handle.response(aedes,stc,response,outgoing);   
                                            }
                                            catch(error)
                                            {
                                                console.log(error);
                                            }
                                        }

                                        break;
                                    }

                                    case "CLEAR":
                                    {
                                        break;
                                    }

                                    default:
                                    {
                                        message = "Invalid command"; status = "invalid"; code = 17; stc = 400;
        
                                        let response = {message,status,code};
        
                                        try
                                        {
                                            handle.response(aedes,stc,response,outgoing);   
                                        }
                                        catch(error)
                                        {
                                            console.log(error);
                                        }

                                        break;
                                    }
                                }
                            }
                            else if(queued)
                            {
                                let message = "Boat " + id + ", " + boat_name + " already queued";

                                let status = "unchanged", code = 3, stc = 200;

                                let response = {message,status,code};

                                try
                                {
                                    handle.response(aedes,stc,response,outgoing);   
                                }
                                catch(error)
                                {
                                    console.log(error);
                                }
                            }
                            else
                            {
                                let message = "Boat " + id + ", " + boat_name + " not connected";

                                let status = "failure", code = 14, stc = 200;

                                let response = {id,boat_name,message,status,code};

                                try
                                {
                                    handle.response(aedes,stc,response,outgoing);   
                                }
                                catch(error)
                                {
                                    console.log(error);
                                }
                            }
                            
                        }
                        else
                        {
                            let message = "No Boat by id " + data.id + " exists";

                            let status = "failure", code = 16, stc = 400;

                            let response = {message,status,code};

                            try
                            {
                                handle.response(aedes,stc,response,outgoing);   
                            }
                            catch(error)
                            {
                                console.log(error);
                            }
                        }
                    }
                    else
                    {
                        let message = "Missing parameters";

                        let status = "unchanged", code = 10, stc = 400;

                        let response = {message,status,code};

                        try
                        {
                            handle.response(aedes,stc,response,outgoing);   
                        }
                        catch(error)
                        {
                            console.log(error);
                        }
                    }
                }
                else if(cl[0] == "BM-DEV" && b)
                {
                    if(cl[1] == aux[1])
                    {
                        let nxt = validateMAC(cl[1]);

                        if(nxt)
                        {
                            let mac = cl[1];

                            let Q = await SQL.SEL("*",null,"BOATS",{mac});

                            if(!Q.status)
                            {
                                if(Q[0])
                                {
                                    let id = Q[0].id, queued = Q[0].queued, on_journey = Q[0].on_journey;

                                    let lj = Q[0].lj, connected = Q[0].connected;

                                    if(b == id && connected)
                                    {
                                        switch(aux[2])
                                        {
                                            case "DEPARTURE":
                                            {
                                                if(queued && !on_journey)
                                                {
                                                    if(timers[id.toString()])
                                                    {
                                                        clearTimeout(timers[id.toString()]);

                                                        delete timers[id.toString()];        
                                                    }

                                                    let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

                                                    let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
                                                    
                                                    let params = 
                                                    {
                                                        ini: dt,
                                                        start_user: data.user_id,
                                                        boat_id: data.id,
                                                        i_weight: data.weight,
                                                        s_img: 0,
                                                        total_img: 0,
                                                        synced: 0,
                                                        obs:data.obs,
                                                        alert:0
                                                    }

                                                    let P = await SQL.PROC("bm_JOURNEYS_ST",params)
                                                    
                                                    let message, status, code, stc;

                                                    device += mac + "/START";
                                                
                                                    if(!P.status)
                                                    {
                                                        try
                                                        {
                                                            handle.response(aedes,200,{message:"OK"},device);    
            
                                                            message = "Boat " + id + "," + boat_name + " set for departure.";
                                                        
                                                            status = "success", code = "1", stc = 200;
                                                            
                                                        }
                                                        catch(error)
                                                        {
                                                            console.log(error);  
            
                                                            message = "Aedes error."; status = "failure"; code = "14";
                                                        
                                                            stc = 500;         
                                                            
                                                            await SQL.UPD("BOATS",{on_journey:0},id);
                                                        }
                                                    }
                                                
                                                    let response = {message,status,code};

                                                    try
                                                    {
                                                        handle.response(aedes,stc,response,outgoing);   
                                                    }
                                                    catch(error)
                                                    {
                                                        console.log(error);
                                                    }
                                                }

                                                break;
                                            }

                                            case "ARRIVAL":
                                            {
                                                if(queued && on_journey)
                                                {
                                                    if(timers[id.toString()])
                                                    {
                                                        clearTimeout(timers[id.toString()]);

                                                        delete timers[id.toString()];        
                                                    }

                                                    let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

                                                    let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
                                                    
                                                    let params = 
                                                    {
                                                        id: lj,
                                                        boat_id: data.id,
                                                        end_user: data.user_id,
                                                        ed: dt,
                                                        f_weight: data.weight,
                                                        obs: data.obs
                                                    }
                                    
                                                    let P = await SQL.PROC("bm_JOURNEYS_ED",params); 
                                                    
                                                    let message, status, code, stc;

                                                    device += mac + "/END";
                                                
                                                    if(!P.status)
                                                    {
                                                        try
                                                        {
                                                            handle.response(aedes,200,{message:"OK"},device);    
            
                                                            message = "Boat " + id + "," + boat_name + ",  arrival confirmed";
                                                        
                                                            status = "success", code = "1", stc = 200;
                                                            
                                                        }
                                                        catch(error)
                                                        {
                                                            console.log(error);  
            
                                                            message = "Aedes error."; status = "failure"; code = "14";
                                                        
                                                            stc = 500;  
                                                            
                                                            await SQL.UPD("BOATS",{on_journey:1},id);
                                                        }
                                                    }
                                                
                                                    let response = {message,status,code};

                                                    try
                                                    {
                                                        handle.response(aedes,stc,response,outgoing);   
                                                    }
                                                    catch(error)
                                                    {
                                                        console.log(error);
                                                    }
                                                }

                                                break;
                                            }
                                            
                                        }
                                    }
                                    
                                }
                                else
                                {
                                    console.log("Uregistered Boat of client id: ",client.id," tried to initiate a journey");
                                }
                            }
                        }
                    }
                }
                else
                {
                    console.log("\n\rUnauthorized client\n\r");
                }
            }
            else
            {
                let response = {message,status,code}, stc = http_code;

                try
                {   
                    if(cl[0] == "BM-APP")
                        handle.response(aedes,stc,response,outgoing);
                    else
                        console.log(response,"\n\rStatus Code: ",stc);
                }
                catch(error)
                {
                    console.log(error);
                } 
            }  
        }
        else
        {
            let message = "Incorrect data format";

            let status = "failure", code = 10, stc = 400;

            let response = {message,status,code};

            try
            {
                if(cl[0] == "BM-APP")
                    handle.response(aedes,stc,response,outgoing);
                else
                    console.log(response,"\n\rStatus Code: ",stc); 
            }
            catch(error)
            {
                console.log(error);
            } 
        }        
    }

});



//Location Google format

//{location:{"lat":,"long":}, "status":"0 for open? 1 for closed?" , Weight:? , Date:, Time:,}

//splits//\n\r

//will received weight be an average of samples done by the boat device?

});