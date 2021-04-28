/*******************************************************************************
********************************************************************************
*                           BOAT MONITOR SERVER                                *
********************************************************************************
*******************************************************************************/


/**********************************MODULES*************************************/
const fs = require('fs');

const https = require('https');

const express = require('express');

const basicAuth = require('express-basic-auth');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

const fileUpload = require('express-fileupload');

const cors = require('cors');

const bodyParser = require('body-parser');

const morgan = require('morgan');

const _ = require('lodash');

const log = require('./modules/logging.js');

const handle = require('./modules/requests.js');

const SQL = require('./modules/sql.js');

/*************************VARIABLES AND INSTANCES*****************************/

const port = [8443,9443,8883];

var privateKey, certificate, credentials;

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
*/
/*********************************FUNCTIONS***********************************/
async function filter(tab,params,command)
{
    let range = null, id = null;
    
    delete params.token;

    if(params.tab)
        delete params.tab;
    
    if(params.id)
    {
        id = params.id;

        delete params.id;
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

            if(Object.keys(params).length > 0)
                where = params;

            Q = await sql.SEL("*",tab,where,range);

            break;
        }

        case "INS":
        {
            Q = await sql.INS(tab,params);
            
            break;
        }

        case "UPD":
        {
            Q = await sql.UPD(tab,params,id)
            
            break;
        }

        case "DEL":
        {
            Q = await sql.DEL(tab,params);
            
            break;
        }
    }

    return Q;   
}

async function verify(req)
{
    let authorized = false, http_code = 500, status = null, code = null, message = null;

    if (req.body.token)
    {
        let token = req.body.token;
        
        if(token.length > 1)
        {
            let id =  token[token.length - 1];

            let Q = sql.SEL("*",null,"USERS",{id},null);

            if(!Q.status && Q[0])
            {
                let password = Q[0].pswrd;

                token = token.slice(0,token.length-1);

                try
                {
                    let decoded =  jwt.verify(token,password);

                    if(!Q[0].st)
                    {
                        http_code = 409;
                        
                        status = "unavailable";
                        
                        code = 6;

                        message = "User is not enabled";
                    } 
                    if(Q[0].blocked)
                    {
                        http_code = 409;
                        
                        status = "blocked";

                        code = 8;

                        message = "Blocked User";
                    }   
                    else if(decoded.id == id)
                    {
                        code = 0;

                        authorized = true; 
                    }
                    else if(decoded.id != id)
                    {
                        http_code = 400;

                        status = "unauthorized";

                        code = 7;
                        
                        message = "Altered token";
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
                           
                            code = 7;
                           
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

    return [authorized,http_code,status,code,message];
}

async function appAuthorizer(username,password,cb)
{   
    let u = {username}, p = null, exists = false;

    let Q = sql.SEL("*",null,"USERS",u,null);

    if(!Q.status && Q[0])
    {
        if(Q[0].pswrd)
        {
            p = Q[0].pswrd;

            exists = true;
        }           
    }

    let passwordMatches = await bcrypt.compare(password, p);

    if(exists & passwordMatches)
        return cb(null,true);
    else
        return cb(null,false);
}

function unauthorized(req)
{
    return req.auth
        ? {message:"Invalid Username or Password",status:"failure"}
        : {message:"No Username or Password were provided",status:"failure"};
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
    
    collector.use(bodyParser.json());
    
    collector.use(bodyParser.urlencoded({extended: true}));
    
    collector.use(morgan('dev'));


    var auth = basicAuth(
    {
        authorizer: appAuthorizer,
        authorizeAsync: true,
        unauthorizedResponse: unauthorized
    });
    
    app = express();
        
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
        let u = {username:req.auth.user};
 
        let id = null, secret = null, token = null;

        let Q = sql.SEL("*",null,"USERS",u,null);

        if(!Q.status && Q[0])
        {
            if(Q[0].pswrd && Q[0].id)
            {
                id = Q[0].id;

                secret = Q[0].pswrd;

                token = jwt.sign({user,id},secret,{expiresIn:60*60}) + id.toString();
            }
        }

        if(token)
            res.status(200).send({token,status:"success"});
        else if(Q.status)
            res.status(500).send(Q);
        else
            res.status(500).send({message:"Unknown Error",status:"failure"});

    });

    app.get("/recovery", async (req,res) => 
    {
        let authorized, message;

        [st,error,authorized,message] =  verify(req);

        if(authorized)
        {
            if(req.body.mail)
                res.status(200).send({status:"success"});
            else
                res.status(400).send({message:"No mail specfied",status:"failure"});
        }
        else if(error)
        {
            res.status(500).send({message,status:"failure"});
        }
        else
        {
            res.status(401).send({message,status:"unauthorized"});
        }
    });

    /*Data Visualization*/

    app.get("/boats", async (req,res) => 
    {
        let authorized, http_code, status, code, message;

        [authorized,http_code,status,code,message] =  verify(req);

        if(authorized)
        {
            let Q; 
            
            Q[0] = {id:1,mac:"b8:27:eb:4f:15:95",boat_name:"CAT",max_st:498.7,resp:1,st:1,ta:0,wa:0,ua:0,obs:null};

            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({BOATS:Q,status:"success"});
                else
                    res.status(200).send({BOATS:Q,status:"empty"});
            }     
            else
                res.status(500).send({Q});
        }
        else
            res.status(http_code).send({status,code,message});
        
    });

    app.get("/users", async (req,res) => 
    {
        let authorized, http_code, status, code, message;

        [authorized,http_code,status,code,message] =  verify(req);

        if(authorized)
        {
            let Q; 
            
            Q[0] = {id:1,username:"@SlipiDuche",names:"Alejandro Camacaro",mail:"ale@gmail.com",usertype:3,blocked:0,st:1,reg:"2021/04/22 19:32:00"};

            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({USERS:Q,status:"success"});
                else
                    res.status(200).send({USERS:Q,status:"empty"});
            }     
            else
                res.status(500).send({Q});
        }
        else
            res.status(http_code).send({status,code,message});
    });

    app.get("/journeys", async (req,res) => 
    {
        let authorized, http_code, status, code, message;

        [authorized,http_code,status,code,message] =  verify(req);

        if(authorized)
        {
            let Q; 
            
            Q[0] = {id:1,ini:"2021/04/22 19:32:00", ed:"2021/04/22 19:45:00",start_user:1,end_user:1,boat_id:1,i_weight:30.1,f_weight:371.2,s_img:0,total_img:0,synced:1,eta:null,obs:null};

            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({JOURNEYS:Q,status:"success"});
                else
                    res.status(200).send({JOURNEYS:Q,status:"empty"});
            }     
            else
                res.status(500).send({Q});
        }
        else
            res.status(http_code).send({status,code,message});
    });

    app.get("/files", async (res,req) => 
    {
        let authorized, http_code, status, code, message;

        [authorized,http_code,status,code,message] =  verify(req);

        if(authorized)
        {
            let Q; 
            
            Q[0] = {id:1,fl_name:"B1_042220211937415959.txt",fl_url:"/files/1/",journey_id:1,boat_id:1,cam:null,rl:1,dt:"2021/04/22 19:37:41",reg:"2021/04/22 19:45:00"};

            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({FILES:Q,status:"success"});
                else
                    res.status(200).send({FILES:Q,status:"empty"});
            }     
            else
                res.status(500).send({Q});
        }
        else
            res.status(http_code).send({status,code,message});
    });

    app.get("/historics", async (req,res) =>
    {
        /*
        
        let initDate = req.ini, endDate = req.end, code = 500;

        let Q = [];
        Q.push(SQL.SEL({"*":"*"},"HISTORICS",{"dt":[initDate,endDate],"ops":"&","cond":">=,<="}));
        Q.push(SQL.SEL({"*":"*"},"FILES",{"dt":[initDate,endDate],"ops":"&","cond":">=,<="}));
        
        if(!Q.status)
            code = 200;

        res.status(code).json(Q);
        
        */

        let authorized, http_code, status, code, message;

        [authorized,http_code,status,code,message] =  verify(req);

        if(authorized)
        {
            let Q; 
            
            Q[0] = {id:1,boat_id:1,journey_id,cont_status:0,open_time:0,cont_weight:371.2,bat:90.7,dsk:5.7,temp:10.7,b_location:"lat:9,long:9",TiP:0.25,fl_name:"B1_042220211937415959.txt",dt:"2021/04/22 19:37:41",reg:"2021/04/22 19:45:00"};

            if(!Q.status)
            {
                if(Q[0])
                    res.status(200).send({HISTORICS:Q,status:"success"});
                else
                    res.status(200).send({HISTORICS:Q,status:"empty"});
            }     
            else
                res.status(500).send({Q});
        }
        else
            res.status(http_code).send({status,code,message});
    }); 

    app.get("files/:reg/:file",handle.downloads);

    app.post("/singup", async () => 
    {
            let params = req.body;

            let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

            let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');

            params.usertype = 4; params.latt = 0; params.st = 0; params.blocked = 0; params.dt = dt;

            let Q = filter("USERS",params,"INS"); 

            if(!Q.status)
            {
                res.status(200).send({status:"success",code:1});
            }     
            else
                res.status(500).send({Q});

    });

    app.post("/create", async () => 
    {
        let authorized, http_code, status, code, message;

        [authorized,http_code,status,code,message] =  verify(req);

        if(authorized)
        {
            let params = req.body;

            if(params.dt)
            {
                let  TZOfsset = (new Date()).getTimezoneOffset() * 60000; 

                let dt = (new Date(Date.now() - TZOfsset)).toISOString().replace(/T|Z/g,' ');

                params.dt = dt;
            }
            
            let Q = filter(params.tab,params,"INS"); 

            if(!Q.status)
            {
                res.status(200).send({status:"success",code:1});
            }     
            else
                res.status(500).send({Q});
        }
        else
            res.status(http_code).send({status,code,message});
    });
}


//Location Google format

//{location:{"lat":,"long":}, "status":"0 for open? 1 for closed?" , Weight:? , Date:, Time:,}

//splits//\n\r

//will received weight be an average of samples done by the boat device?
