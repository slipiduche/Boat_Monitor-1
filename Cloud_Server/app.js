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

const fileUpload = require('express-fileupload');

const cors = require('cors');

const bodyParser = require('body-parser');

const morgan = require('morgan');

const _ = require('lodash');

const log = require('./modules/logging.js');

const handle = require('./modules/request.js');

const SQL = require('./modules/sql.js')

/*************************VARIABLES AND INSTANCES*****************************/

const port = [8443,9443];

var privateKey, certificate, credentials;

var collector, app, httpsServer;

var creds  = false;

/*********************************FUNCTIONS***********************************/
async function appAuthorizer(username,password,cb)
{
    let u,p;

    const userMatches = basicAuth.safeCompare(username, u);
    
    const passwordMatches = basicAuth.safeCompare(password, p)

    if(userMatches & passwordMatches)
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

    authenticator = express();

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
            console.log("App is listening on port ${port}.")
    });

    httpsServer[1].listen(port[1], (error) =>
    {
        if(error)
            log.errorLog("",error,1); //error10
        else
            console.log("App is listening on port ${port}.")
    });

    app.get("/login", auth, async (req,res) =>
    {
        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        res.status(200).send({token,status:"success"});
    });

    app.post("/process", (req,res) =>
    {
        let ok = false, filenames = [], status = {},code;

        [ok,filenames,status,code] = handle.uploads(res,req);

        if(ok)
            [status,code] = handle.data(res,req,filenames);
        
        res.status(code).send(status);         
    });

    app.get("/historics", async (req,res) =>
    {
        let initDate = req.ini, endDate = req.end, code = 500;

        let Q = [];
        Q.push(SQL.SEL({"*":"*"},"HISTORICS",{"dt":[initDate,endDate],"ops":"&","cond":">=,<="}));
        Q.push(SQL.SEL({"*":"*"},"FILES",{"dt":[initDate,endDate],"ops":"&","cond":">=,<="}));
        
        if(!Q.status)
            code = 200;

        res.status(code).json(Q);
    }); 

    app.get("files/:reg/:file",handle.downloads);
}


//Location Google format

//{location:{"lat":,"long":}, "status":"0 for open? 1 for closed?" , Weight:? , Date:, Time:,}

//splits//\n\r

//will received weight be an average of samples done by the boat device?
