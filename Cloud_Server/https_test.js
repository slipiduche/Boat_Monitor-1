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

const util = require('util');

const _ = require('lodash');

const log = require('./modules/logging.js');

const handle = require('./modules/requests.js');

const SQL = require('./modules/sql.js');

const sharp = require('sharp');

const { send } = require('process');
const { error } = require('console');

/*************************VARIABLES AND INSTANCES*****************************/

const port = 9443;

var privateKey, certificate, credentials;

var app, httpsServer;

var creds  = false;

/*********************************FUNCTIONS***********************************/

function charRemove(str,symbol,n)
{
    let k = 0;

    for(let i = 0; i<str.length; i++)
    {
        if(str[i] == symbol)
        {
            k++;

            if(k == (n -1))
            {
                str = str.slice(0,i) + str.slice(i+1);

                break;
            }
        }
    } 

    return str;
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
            log.errorLog("",error,1); //error10
        else
            console.log("App is listening on port %d.",[port])
    });

    app.get('/testo', (req,res) =>
    {
        console.log('henlo');
        res.status(200).json({OUT:"henlo!"});
    });

    app.get('/get', async function  A (req,res)
    {
        let p = 'C:\\Users\\CLIM-DESKTOP\\Downloads\\IMG_20210506_140531547.jpg';

        let size = 0;

        let compression = false;
        try
        {         
            let stream =  fs.createReadStream(p);

            if(compression)
            {
                res.writeHead(200, {'Content-Type': "image/jpeg"});

                let compress = sharp().rotate().resize(530).jpeg({ mozjpeg: true, quality:60});

                stream =stream.pipe(compress).on("data",(chunk) => size+=chunk.length).pipe(res)
                    .on("error",(err) => console.log(err))
            }
            else
            {
                let stat = util.promisify(fs.stat);

                size = (await stat(p)).size;

                res.writeHead(200, {'Content-Type': "image/jpeg",'Content-Length':size});       

                stream = stream.pipe(res)
                    .on("error",(err) => console.log(err))
                    
            }

            stream.on("finish",() => console.log("%d bytes of data sent",size));
        }
        catch(error)
        {
            console.log(error);

            res.status(500).semd(error);
        }

             
        
    });

   
    app.post('/kitty',async (req,res)=>
    {
        console.log(req.headers);

        res.send({murp:"marp"});
    });

    app.get('/kitty2',async (req,res)=>
    {
        console.log(req.headers);

        res.send({murp:"marp"});
    });


        
        
   
    app.post('/upload-audio', async (req, res) => 
    {
        try 
        {
            if(!req.files) 
            {
                res.send(
                {
                    status: false,
                    message: 'No file uploaded'
                });
            } 
            else 
            {
                //let details = JSON.parse(req.body.details);
                
        
                if(true)//(TOKEN && details.TOKEN == TOKEN)
                {
                    //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
                    let audio = req.files.audio;
                    
                    let Q;
                    
                    let flag = true;

                    let n = 0;
                    
                    let path = "C:\\Streaming_Server\\files\\music";
                
                    let filename = audio.name;

                    console.log(filename);

                    let file;
                    
                    filename = filename.replace(/ /g,'_');
                    
                    let f = filename.split('.');

                    if(filename.length > 26)
                    {
                        let l = f.length;

                        if(f[l-1].length >= 25)
                            file = filename.slice(0,22) + ".weird";
                        else
                            file = filename.slice(0,25 - f[l-1].length) + "." + f[l-1];

                        f = file.split('.');
                    }
                    else
                        file = filename;
                    
                    let dots = f.length;

                    f[dots] = f[dots - 1];
                    
                    f[dots - 1] = "";
            
                    let exists = util.promisify(fs.access);

                    let save = util.promisify(audio.mv);
                    
                    console.log(req);
                    
                    while(flag)
                    {
                        file = f.join('.');

                        file = charRemove(file,'.',dots);

                        try
                        {
                            await exists(path + "\\" + file, fs.F_OK); 

                            console.log(n.toString() + ". File exists. ");

                            n++;

                            f[dots - 1] = "("+n.toString()+")";
                        }
                        catch(error)
                        {
                            console.log("Saving " + file);

                            await save(path + "\\" + file);

                            console.log(file + " saved.");

                            let dt = {};

                            //dt.FIELD1 = details.song;

                            //dt.FIELD2 = details.artist;

                            //dt.FIELD3 = file;

                            //Q = await SQL.INS("MUSIC", dt);
        
                            //if(!Q.STATUS)
                                Q = "Succeeded on modifying database.";
                            //else
                                //Q = "Failed to modify database";

                            flag = false;
                        }
                    
                    }
                
                //send response
                    res.send(
                    {
                        MESSAGE: 'File was successfully uploaded',
                        
                        STATUS: Q,

                        DATA: 
                        {
                            NAME: file,
                            MIMETYPE: audio.mimetype,
                            SIZE: audio.size
                        }

                    });
                }
                else if (!TOKEN)
                {
                    res.status(500).send({STATUS:"LOGIN"});
                }
                else
                {
                    res.status(500).send({STATUS:"INVALID"});
                }
            }
        } 
        catch(error) //error11
        {
            console.log(error);
            res.status(500).send({STATUS:"ERROR"});
        }
    });
}