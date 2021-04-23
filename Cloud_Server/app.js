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

const handle = require('./modules/requests.js');

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
        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        res.status(200).send({token,status:"success"});
    });

    app.get("/recovery", async (req,res) => 
    {
        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        if(req.body.token && req.body.token == token)
        {
            if(req.body.mail)
                res.status(200).send({status:"success"});
            else
                res.status(500).send({message:"No mail specfied",status:"failure"});
        }
        else
        {
            res.status(500).send({message:"Unauthorized",status:"failure"});
        }
    });

    /*Data Visualization*/

    app.get("/boats", async (req,res) => 
    {
        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        if(req.body.token && req.body.token == token)
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
        {
            res.status(500).send({message:"Unauthorized",status:"failure"});
        }
    });

    app.get("/users", async (req,res) => 
    {
        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        if(req.body.token && req.body.token == token)
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
        {
            res.status(500).send({message:"Unauthorized",status:"failure"});
        }
    });

    app.get("/journeys", async (req,res) => 
    {
        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        if(req.body.token && req.body.token == token)
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
        {
            res.status(500).send({message:"Unauthorized",status:"failure"});
        }
    });

    app.get("/files", async (res,req) => 
    {
        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        if(req.body.token && req.body.token == token)
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
        {
            res.status(500).send({message:"Unauthorized",status:"failure"});
        }
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

        let token = "eiubfqweiaowbroqrfyuiqwegajrui2iw[3y35dq59wt9634w4t4446r6i6j441";

        if(req.body.token && req.body.token == token)
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
        {
            res.status(500).send({message:"Unauthorized",status:"failure"});
        }
    }); 

    app.get("files/:reg/:file",handle.downloads);
}


//Location Google format

//{location:{"lat":,"long":}, "status":"0 for open? 1 for closed?" , Weight:? , Date:, Time:,}

//splits//\n\r

//will received weight be an average of samples done by the boat device?
