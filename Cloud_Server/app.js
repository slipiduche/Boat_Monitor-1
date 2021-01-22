/*******************************************************************************
********************************************************************************
*                           BOAT MONITOR SERVER                                *
********************************************************************************
*******************************************************************************/


/**********************************MODULES*************************************/
const fs = require('fs');

const https = require('https');

const express = require('express');

const fileUpload = require('express-fileupload');

const cors = require('cors');

const bodyParser = require('body-parser');

const morgan = require('morgan');

const _ = require('lodash');

const log = require('./modules/logging.js');

const handle = require('./modules/request.js');

const SQL = require('./modules/sql.js')

/*************************VARIABLES AND INSTANCES*****************************/

const port = 8443;

var privateKey, certificate, credentials;

var app, httpsServer;

var creds  = false;

/*********************************FUNCTIONS***********************************/

/*******************************INITIALIZATION********************************/

try
{
    privateKey = fs.readFileSync('sslcert/server.key', 'utf8');

    certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
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
    app = express();

    app.use(fileUpload(
    {
        createParentPath: true
    }));
        
    app.use(cors());
    
    app.use(bodyParser.json());
    
    app.use(bodyParser.urlencoded({extended: true}));
    
    app.use(morgan('dev'));
        
    httpsServer = https.createServer(credentials, app);

    httpsServer.listen(port, (error) =>
    {
        if(error)
            logg.errorLog("",error,1); //error10
        else
            console.log("App is listening on port ${port}.")
    });

    app.post("/dup", (req,res) =>
    {
        let ok = false;

        let filenames;

        [ok,filenames] = handle.uploads(res,req);

        if(ok)
            handle.data(res,req,filenames);
    });

    app.get("/historics", (res,req) =>
    {
        let initDate = res.ini;
        
        let endDate = res.end;

        let Q = SQL.SEL("*","HISTORICS WHERE date >= '" + initDate + "' AND date <= '" + endDate + "';","","",true)
        
        res.status(200).json(Q);
    });
}


//Location Google format

//{location:{"lat":,"long":}, "status":"0 for open? 1 for closed?" , Weight:? , Date:, Time:,}

//splits//\n\r

//will received weight be an average of samples done by the boat device?
