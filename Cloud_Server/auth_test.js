/**********************************MODULES*************************************/
const fs = require('fs');

const https = require('https');

const express = require('express');

const basicAuth = require('./modules/basic.js');

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
9: Access Denied
*/
/*********************************FUNCTIONS***********************************/
async function appAuthorizer(username,password,cb)
{   
    let userMatches = basicAuth.safeCompare(username,"Orbittas");

    let passwordMatches = basicAuth.safeCompare(password,"test");

    let data = {message:"User is Blocked",status:"blocked",code:8};

    if(userMatches & passwordMatches)
        return cb(null,true,data);
    else 
        return cb(null,false,data);
    
       
}

function unauthorized(req,data)
{
    let response;
    
    if(!data)
        return req.auth
               ? {message:"Invalid Username or Password",status:"unauthroized",code:7}
               : {message:"No Username or Password were provided",status:"unauthroized",code:7};
    else
        return data;
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
    
    collector.use(express.urlencoded({extended: true}));
    
    collector.use(morgan('dev'));


    var auth = basicAuth(
    {
        authorizer: appAuthorizer,
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

    function sendResponse(res,status,payload)
    {
        process.stdout.write("\n\rServer Resonse: "); console.log(payload);
        process.stdout.write("Status Code: "); console.log(status); console.log();

        res.status(status).send(payload);
    }

    /*Authentication and Recovery*/

    app.get("/login", auth, async (req,res) =>
    {
        req.data.cat = "CAT";

        console.log(req.body);
        
        sendResponse(res,200,req.data);
    });

}