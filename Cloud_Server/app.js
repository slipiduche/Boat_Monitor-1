/*******************************************************************************
********************************************************************************
*                           BOAT MONITOR SERVER                                *
********************************************************************************
*******************************************************************************/


/**********************************MODULES*************************************/
const fs = require('fs');

const https = require('https');

const express = require('express');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

const fileUpload = require('express-fileupload');

const cors = require('cors');

const morgan = require('morgan');

const _ = require('lodash');

const basicAuth = require('./modules/basic.js');

const log = require('./modules/logging.js');

const handle = require('./modules/requests.js');

const SQL = require('./modules/sql.js');

const e = require('express');
const { ifError } = require('assert');


/*************************VARIABLES AND INSTANCES*****************************/

const port = [8443,9443,8883];

const BOATS = ["id","boat_name","max_st","resp","st","obs"];

const USERS = ["id","username","names","mail","usertype","latt","ldt","blocked","st","dt"];

const bex = ["mac","max_st"];

const uex_self = ["username","names","mail","usertype","latt","ldt","blocked","st","dt"];

const uex = ["latt","ldt","blocked","st"];

const jex_ini = ["ed","end_user","i_weight","f_weight","s_img","total_img","synced"];

const jex_ed = ["ini","start_user","i_weight","f_weight","s_img","total_img","synced"];

const C = ["USERS","JOURNEYS"];

const M = ["BOATS","USERS","JOURNEYS"];

var collector, app, httpsServer = [];

var creds  = false;

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
*/
/*********************************FUNCTIONS***********************************/
async function filter(tab,retrieve,params,command)
{
    let range = null, id = null,  rest = null, uid = null;
    
    if(params.auth)
        delete params.auth;

    if(params.data)
        delete params.data;

    if(params.tab)
        delete params.tab;
    
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
            let where = null;

            let selection = "*";

            if(retrieve)
                selection = retrieve.join();
            

            if(Object.keys(params).length > 0)
                where = params;
           
            Q = await SQL.SEL(selection,rest,tab,where,range);

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
    let authorized = false, http_code = 500, status = null, code = null, message = null, usertype = null;

    if (req.body.token)
    {
        let token = req.body.token;
        
        if(token.length > 1)
        {
            let id =  token[token.length - 1];

            let Q = await SQL.SEL("*",null,"USERS",{id},null);

            if(!Q.status && Q[0])
            {
                let password = Q[0].pswrd;

                token = token.slice(0,token.length-1);

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
                    if(Q[0].blocked)
                    {
                        http_code = 403;
                        
                        status = "blocked";

                        code = 8;

                        message = "Blocked User";
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

                            message = "Bad token";
                            
                            break;
                        }
                    }
                } 
            }
            else
            {
                status = "failure";
                
                code = 5;
                
                message = Q.message;
            }                            
        }        
    }

    return [authorized,http_code,status,code,message,usertype];
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

        if(Q[0].st)
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
        else
        {
            data = {message:"User is not enabled",status:"unavailable",code:6}
        }      
    }
    else if (!Q[0])
        data = {message:"User not registered",status:"unregistered",code:11}
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

function sendResponse(res,status,payload)
{
    process.stdout.write("\n\rServer Response: "); console.log(payload);
    process.stdout.write("Status Code: "); console.log(status); console.log();

    res.status(status).send(payload);
}

function unauthorized(req,data)
{
    if(!data)
        return req.auth
               ? {message:"Invalid Username or Password",status:"unauthorized",code:7}
               : {message:"Authentication parameters not prvided",status:"failure",code:4};
    else
        return data;
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

function exclude(tab,command,params,exclusions,id,uid)
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
            if(command == "INS")
                params = removal(params,jex_ini);
            else
                params = removal(params,jex_ed);

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

/*******************************INITIALIZATION********************************/

try
{
    privateKey = fs.readFileSync('sslcert/domain.key', 'utf8');

    certificate = fs.readFileSync('sslcert/domain.crt', 'utf8');
    
    credentials = {key: privateKey, cert: certificate};

    creds = true;
}
catch(error)
{
    console.log("Unable to get Key and Ceritficate.");

    log.errorLog("creds","Unable to get Key and Ceritficate.\n\r\n\r" + error.toString(),1);
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

    httpsServer[0].listen(port[0], (error) =>
    {
        if(error)
            log.errorLog("",error,1); //error10
        else
            console.log("App is listening on port " + port[0] + ".")
    });

    httpsServer[1].listen(port[1], (error) =>
    {
        if(error)
            log.errorLog("",error,1); //error10
        else
            console.log("App is listening on port " + port[1] + ".")
    });

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
        
        console.log(); console.log(req.url); console.log();

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
                    token = jwt.sign({user,id},secret,{expiresIn:60*60}) + id.toString();

                    console.log("\n\rToken: " + token + "\n\r");

                    if(token)
                        sendResponse(res,200,{token,usertype,status:"success",code:1});
                    else
                        sendResponse(res,500,{message:"Unknown Error",status:"failure",code:4});
                }              
                else
                    sendResponse(res,500,{message:"Database Integrity Issue; Null Values",status:"failure",code:4});

            }
            else
                sendResponse(res,500,req.data);
 
        }
        catch(error)
        {
            sendResponse(res,500,{message:error.toString(),status:"failure",code:4});
        }

    });

    app.get("/recovery", sup, async (req,res) => 
    {
        let params = req.body;

        console.log(); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        let mail = params.mail;

        let W = await SQL.SEL("*",null,"USERS",{mail},null);

        if(!W.status)
        {
            if(W[0])
            {
                if(W[0].username)
                {
                    sendResponse(res,403,{message:"User Already Exists",status:"unchanged",code:3});
                }
                else
                    sendResponse(res,500,{message:"Database Integrity Issue",status:"failure",code:4});
            }
            else
            {
                let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

                let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
        
                params.usertype = 4; params.latt = 0; params.st = 0; params.blocked = 0; params.dt = dt;
                
                params.pswrd = await bcrypt.hash(params.pswrd,10);

                console.log("hashing complete");
                
                let Q = await filter("USERS",null,params,"INS"); 
        
                if(!Q.status)
                {
                    sendResponse(res,200,{message:"User Created",status:"success",code:1});
                }     
                else
                    sendResponse(res,500,Q);           
            }
        }
        else
            sendResponse(res,500,W);
    });

    /*Data Visualization*/

    app.get("/boats", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype;

        [authorized,http_code,status,code,message,usertype] =  verify(req,1);

        if(authorized)
        {
            let Q = filter("BOATS",BOATS,req.body,"SEL");
            
            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({BOATS:Q[0],status:"success",code:1});
                else
                    res.status(200).send({BOATS:[],status:"empty",code:2});
            }     
            else
                res.status(500).send(Q);
        }
        else
            res.status(http_code).send({status,code,message});      
    });

    app.get("/users", async (req,res) => 
    {
        let authorized, http_code, status, code, message,usertype;

        [authorized,http_code,status,code,message,usertype] =  verify(req,1);

        if(authorized)
        {   
            req.body.rest = usertype;

            let Q = filter("USERS",USERS,req.body,"SEL");
            
            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({BOATS:Q[0],status:"success",code:1});
                else
                    res.status(200).send({BOATS:[],status:"empty",code:2});
            }     
            else
                res.status(500).send(Q);
        }
        else
            res.status(http_code).send({status,code,message});      
    });

    app.get("/journeys", async (req,res) => 
    {
        let authorized, http_code, status, code, message,usertype;

        [authorized,http_code,status,code,message,usertype] =  verify(req,1);

        if(authorized)
        {
            let Q = filter("JOURNEYS",null,req.body,"SEL");
            
            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({BOATS:Q[0],status:"success",code:1});
                else
                    res.status(200).send({BOATS:[],status:"empty",code:2});
            }     
            else
                res.status(500).send(Q);
        }
        else
            res.status(http_code).send({status,code,message});      
    });

    app.get("/files", async (res,req) => 
    {
        let authorized, http_code, status, code, message,usertype;

        [authorized,http_code,status,code,message,usertype] =  verify(req,1);

        if(authorized)
        {
            let Q = filter("FILES",null,req.body,"SEL");
            
            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({BOATS:Q[0],status:"success",code:1});
                else
                    res.status(200).send({BOATS:[],status:"empty",code:2});
            }     
            else
                res.status(500).send(Q);
        }
        else
            res.status(http_code).send({status,code,message});      
    });

    app.get("/historics", async (req,res) =>
    {
        let authorized, http_code, status, code, message,usertype;

        [authorized,http_code,status,code,message,usertype] =  verify(req,1);

        if(authorized)
        {
            let Q = filter("HISTORICS",null,req.body,"SEL");
            
            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({BOATS:Q[0],status:"success",code:1});
                else
                    res.status(200).send({BOATS:[],status:"empty",code:2});
            }     
            else
                res.status(500).send(Q);
        }
        else
            res.status(http_code).send({status,code,message});  
    }); 

    app.get("/alerts", async (req,res) =>
    {
        let authorized, http_code, status, code, message,usertype;

        [authorized,http_code,status,code,message,usertype] =  verify(req,1);

        if(authorized)
        {
            let Q = filter("ALERTS",null,req.body,"SEL");
            
            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({BOATS:Q[0],status:"success",code:1});
                else
                    res.status(200).send({BOATS:[],status:"empty",code:2});
            }     
            else
                res.status(500).send(Q);
        }
        else
            res.status(http_code).send({status,code,message});  
    }); 

    app.get("files/:reg/:file",handle.downloads);

    app.post("/signup", sup, async (req,res) => 
    {
        let params = req.body;

        let body = Object.keys(req.body).length;

        console.log(); console.log(req.url); console.log();

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
                        sendResponse(res,403,{message:"User Already Exists",status:"unchanged",code:3});
                    }
                    else
                        sendResponse(res,500,{message:"Database Integrity Issue",status:"failure",code:4});
                }
                else
                {
                    let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 
    
                    let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
            
                    params.usertype = 4; params.latt = 0; params.st = 0; params.blocked = 0; params.dt = dt;
                    
                    params.pswrd = await bcrypt.hash(params.pswrd,10);
    
                    console.log("hashing complete");
                    
                    let Q = await filter("USERS",null,params,"INS"); 
            
                    if(!Q.status)
                    {
                        sendResponse(res,200,{message:"User Created",status:"success",code:1});
                    }     
                    else
                        sendResponse(res,500,Q);           
                }
            }
            else
                sendResponse(res,500,W);
        }
        else
            sendResponse(res,400,{message:"No Body",status:"failure",code:4});
    });

    app.post("/create", async (req,res) => 
    {
        let authorized = false, access, http_code, status, code, message, min = 1;
        
        let id, usertype, body = Object.keys(req.body).length;
        
        console.log(); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            if(req.body.token)
                id = req.body.token[req.body.token.length - 1];

            usertype = req.body.usertype;
    
            if(usertype)
                min = usertype + 1;
    
            access = data_access(req.body.tab,C);

            if(access)
            {
                [authorized,http_code,status,code,message] =  await verify(req,min);

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
                let W = await SQL.SEL("*",null,"USERS",{id},null);

                if(!W.status)
                {
                    if(W[0])
                    {
                        proceed = false; 

                        if(W[0].username)
                        {   
                            sendResponse(res,403,{message:"User Already Exists",status:"unchanged",code:3});
                        }
                        else
                            sendResponse(res,500,{message:"Database Integrity Issue",status:"failure",code:4});
                    }
                }
                else
                {
                    sendResponse(res,500,W);

                    proceed = false;
                }
            }

            if(proceed)
            {
                if(params.dt || params.ini)
                {
                    let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 
    
                    let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
                    
                    if(params.dt)
                        params.dt = dt;
                    else
                        params.ini = dt;
                }

                if(params.start_user)
                    params.start_user = id;

                if(params.pswrd)
                {
                    params.pswrd = await bcrypt.hash(params.pswrd,10);

                    console.log("hashing complete");    
                }
                
                let Q = await filter(params.tab,null,params,"INS"); 
    
                if(!Q.status)
                {
                    sendResponse(res,200,{message:"New entry successfully created",status:"success",code:1});
                }     
                else
                    sendResponse(res,500,Q);
            }
  
        }
        else
            sendResponse(res,http_code,{message,status,code});       
    });

    app.post("/modify", async (req,res) => 
    {
        let authorized = false, access = false, http_code, status, code, message, min = 1;

        let usertype, id, body = Object.keys(req.body).length, params;
        
        console.log(); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            usertype = req.body.usertype;
            
            if(req.body.token)
                id = req.body.token[req.body.token.length - 1];

            if(usertype && req.body.id != id)
                min = usertype + 1;
        
            access = data_access(req.body.tab,M);

            if(access)
            {
                params = req.body;

                if(params.id)
                    [authorized,http_code,status,code,message] =  await verify(req,min);
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
            if(params.dt || params.ed)
            {
                let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

                let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');
                
                if(params.dt)
                    params.dt = dt;
                else
                    params.ed = dt
            }
            
            if(params.end_user)
            {
                params.end_user = id;
            }

            if(params.pswrd)
            {
                params.pswrd = await bcrypt.hash(params.pswrd,10);

                console.log("hashing complete");    
            }

            let Q = await filter(params.tab,null,params,"UPD"); 

            if(!Q.status)
            {
                sendResponse(res,200,{message:"New entry successfully created",status:"success",code:1});
            }     
            else
            {
                if(Q.code == 3)
                    sendResponse(res,400,Q);
                else 
                    sendResponse(res,500,Q);
            }           
        }
        else
            sendResponse(res,http_code,{message,status,code});       
    });
}


//Location Google format

//{location:{"lat":,"long":}, "status":"0 for open? 1 for closed?" , Weight:? , Date:, Time:,}

//splits//\n\r

//will received weight be an average of samples done by the boat device?
