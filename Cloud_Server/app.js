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

/*************************VARIABLES AND INSTANCES*****************************/

const port = [8443,9443,8883];

const BOATS = ["id","boat_name","max_st","resp","st","obs"];

const USERS = ["id","username","names","mail","usertype","latt","ldt","blocked","st","approval","lav","dt"];

const bex = ["mac","max_st"];

const uex_self = ["username","names","mail","usertype","latt","ldt","blocked","st","approval","dt"];

const uex = ["latt","ldt","blocked","lav"];

const jex_ini = ["ed","end_user","i_weight","f_weight","s_img","total_img","synced"];

const jex_ed = ["ini","start_user","i_weight","f_weight","s_img","total_img","synced"];

const C = ["USERS","JOURNEYS"];

const M = ["BOATS","USERS","JOURNEYS"];

var collector, app, httpsServer = [];

var creds  = false;

var test = true;

var testAccount = null;

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
    let range = null, id = null,  rest = null, uid = null, last = false;
    
    process.stdout.write("check: ");
    
    console.log(params);

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
            let where = null;

            let selection = "*";

            if(retrieve)
                selection = retrieve.join();
            

            if(Object.keys(params).length > 0)
                where = params;
           
            Q = await SQL.SEL(selection,rest,tab,where,range,last);

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
    let authorized = false, http_code = 500, status = null, code = null, message = null, usertype = null, id = null;

    if (req.body.token)
    {
        let token = req.body.token;
        
        if(token && token.length > 3)
        {
            [token,id] = NaNFinder(token);
            
            console.log("token");

            let Q = await SQL.SEL("*",null,"USERS",{id},null);

            if(!Q.status && Q[0])
            {
                let password = Q[0].pswrd;

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

    return [authorized,http_code,status,code,message,usertype,id];
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
    log.errorLog("creds","Unable to get Key and Ceritficate.\n\r\n\r" + error.toString(),1);
}

try
{
    if(test)
        testAccount = nodemailer.createTestAccount();

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
        
        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

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
                        handle.response(res,200,{token,usertype,status:"success",code:1});
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

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

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
                            handle.mailing({username,mail,password},testAccount);

                            handle.response(res,200,{message:"An email containing new credentials was sent",status:"success",code:1});
                        }
                        catch(error)
                        {
                            log.errorLog(mail,error.tostring(),1);

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
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] = await verify(req,1);

            if(authorized)
            {
                console.log(req.body);

                let Q = await filter("BOATS",BOATS,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        let csv = req.body.csv;

                        if(!csv)
                            handle.response(res,200,{BOATS:Q[0],status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = handle.data2CSV(id,req.hostname,"BOATS",Q[0]);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({url},true,testAccount);

                                    let resp = {message:`URL: ${url} sent. Valid for 24 hours only`,status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {message:`Unable to send mail. But here is the URL: ${url}. Valid for 24 hours only`,status:"failure",code:4};

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
                        handle.response(res,200,{BOATS:[],status:"empty",code:2});
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
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype, id] =  await verify(req,1);

            if(authorized)
            {   
                req.body.rest = usertype;

                let Q = await filter("USERS",USERS,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        let csv = req.body.csv;

                        if(!csv)
                            handle.response(res,200,{USERS:Q[0],status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = handle.data2CSV(id,req.hostname,"USERS",Q[0]);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({url},true,testAccount);

                                    let resp = {message:`URL: ${url} sent. Valid for 24 hours only`,status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {message:`Unable to send mail. But here is the URL: ${url}. Valid for 24 hours only`,status:"failure",code:4};

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
                        handle.response(res,200,{USERS:[],status:"empty",code:2});
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
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] =  await verify(req,1);
      
            if(authorized)
            {
                let Q = await filter("JOURNEYS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        let csv = req.body.csv;

                        if(!csv)
                            handle.response(res,200,{JOURNEYS:Q[0],status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = handle.data2CSV(id,req.hostname,"TRAVELS",Q[0]);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({url},true,testAccount);

                                    let resp = {message:`URL: ${url} sent. Valid for 24 hours only`,status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {message:`Unable to send mail. But here is the URL: ${url}. Valid for 24 hours only`,status:"failure",code:4};

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
                        handle.response(res,200,{JOURNEYS:[],status:"empty",code:2});
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

    app.get("/files", async (res,req) => 
    {
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] =  await verify(req,1);

            if(authorized)
            {
                let Q = await filter("FILES",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        let csv = req.body.csv;

                        if(!csv)
                            handle.response(res,200,{FILES:Q[0],status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = handle.data2CSV(id,req.hostname,"FILES",Q[0]);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({url},true,testAccount);

                                    let resp = {message:`URL: ${url} sent. Valid for 24 hours only`,status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {message:`Unable to send mail. But here is the URL: ${url}. Valid for 24 hours only`,status:"failure",code:4};

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
                        handle.response(res,200,{FILES:[],status:"empty",code:2});
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
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] = await verify(req,1);
            
            if(authorized)
            {
                let Q = await filter("HISTORICS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        let csv = req.body.csv;

                        if(!csv)
                            handle.response(res,200,{HISTORICS:Q[0],status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = handle.data2CSV(id,req.hostname,"HISTORICS",Q[0]);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({url},true,testAccount);

                                    let resp = {message:`URL: ${url} sent. Valid for 24 hours only`,status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {message:`Unable to send mail. But here is the URL: ${url}. Valid for 24 hours only`,status:"failure",code:4};

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
                        handle.response(res,200,{HISTORICS:[],status:"empty",code:2});
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
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] = await verify(req,1);

            if(authorized)
            {
                let Q = await filter("ALERTS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        let csv = req.body.csv;

                        if(!csv)
                            handle.response(res,200,{ALERTS:Q[0],status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = handle.data2CSV(id,req.hostname,"ALERTS",Q[0]);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({url},true,testAccount);

                                    let resp = {message:`URL: ${url} sent. Valid for 24 hours only`,status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {message:`Unable to send mail. But here is the URL: ${url}. Valid for 24 hours only`,status:"failure",code:4};

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
                        handle.response(res,200,{ALERTS:[],status:"empty",code:2});
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
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] = await verify(req,2);

            if(authorized)
            {
                let Q = await filter("ALERTS",null,req.body,"SEL");
                
                if(!Q.status)
                {
                    if(Q[0])
                    {
                        let csv = req.body.csv;

                        if(!csv)
                            handle.response(res,200,{REQUESTS:Q[0],status:"success",code:1});
                        else
                        {
                            let ok, url;

                            [ok,url] = handle.data2CSV(id,req.hostname,"REQUESTS",Q[0]);

                            if(ok)
                            {
                                try
                                {
                                    await handle.mailing({url},true,testAccount);

                                    let resp = {message:`URL: ${url} sent. Valid for 24 hours only`,status:"success",code:1};

                                    handle.response(res,200,resp);
                                }
                                catch(error)
                                {
                                    console.log(error);

                                    let resp = {message:`Unable to send mail. But here is the URL: ${url}. Valid for 24 hours only`,status:"failure",code:4};

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
                        handle.response(res,200,{ALERTS:[],status:"empty",code:2});
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

    app.get("files/zip", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id,  body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] = await verify(req,1);

            if(authorized)
                handle.downloads(req,res);
            else
                handle.response(res,http_code,{message,status,code});
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});    
    });

    app.get("files/:type/:file", async (req,res) => 
    {
        let authorized, http_code, status, code, message, usertype, id, body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        if(body)
        {
            [authorized,http_code,status,code,message,usertype,id] = await verify(req,1);

            if(authorized)
                handle.downloads(req,res);
            else
                handle.response(res,http_code,{message,status,code});
        }
        else
            handle.response(res,400,{message:"No Body",status:"failure",code:4});    
    });

    app.get("download/:token", async (req,res) =>
    {
        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

        process.stdout.write("Request: "); console.log(req.body); console.log();

        handle.downloads(req,res);

    });

    app.post("/signup", sup, async (req,res) => //add approval
    {
        let params = req.body;

        let body = Object.keys(req.body).length;

        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

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

    app.post("/create", async (req,res) => 
    {
        let authorized = false, access, http_code, status, code, message, min = 1;
        
        let id, usertype, body = Object.keys(req.body).length;
        
        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

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

                [authorized,http_code,status,code,message,aux,id] =  await verify(req,min);

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
        
        console.log(); process.stdout.write(req.hostname); console.log(req.url); console.log();

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
        
            access = data_access(req.body.tab,M);

            if(access)
            {
                params = req.body;

                let aux, aux1;

                if(params.id)
                    [authorized,http_code,status,code,message,aux,aux1] =  await verify(req,min);
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
                handle.response(res,200,{message:"New entry successfully created",status:"success",code:1});
            }     
            else
            {
                if(Q.code == 3)
                    handle.response(res,400,Q);
                else 
                    handle.response(res,500,Q);
            }           
        }
        else
            handle.response(res,http_code,{message,status,code});       
    });
}


//Location Google format

//{location:{"lat":,"long":}, "status":"0 for open? 1 for closed?" , Weight:? , Date:, Time:,}

//splits//\n\r

//will received weight be an average of samples done by the boat device?
