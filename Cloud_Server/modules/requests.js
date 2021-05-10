/*******************************************************************************
********************************************************************************
*                             Request Handling                                 *
********************************************************************************
*******************************************************************************/

/**********************************MODULES*************************************/
const fs = require('fs');

const path = require('path');

const util = require('util');

const nodemailer = require('nodemailer');

const jwt = require('jsonwebtoken');

const pg = require('generate-password');

const log = require('./logging.js');

const sql = require('./sql.js');

const dir  = ["./files/historics/","./files/media/snapshots/","./files/media/recordings/","./files/csv","./files/zips"];

/*********************************PARAMETERS**********************************/
var transporter = nodemailer.createTransport(
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

function quote(str)
{
    return "\"" + str + "\"";
}

function gen(length,symbols)
{
    return pswrd = pg.generate(
    {
        length,
        numbers:true,
        symbols,
        uppercase:true,
        lowercase:true,
        strict:true
    });
}

function dateNaming()
{
    let now = Date.now();

    let date = new Date(now);

    let y = date.getFullYear();

    let m = date.getMonth();

    let d = date.getDate();

    let h = date.getHours();

    let min = date.getMinutes();

    let s = date.getSeconds();

    let z = date.getMinutes();

    let regEX = /T|Z/g;

    return [`${y}${m+1}${d}${h}${min}${s}${z}`,date.toISOString().replace(regEX," ")];    
}

async function getTravel()
{
    let J = SQL.SEL()
}
async function CSVgen()
{

}
/**********************************EXPORTS************************************/
module.exports.response = (res,status,payload) =>
{
    process.stdout.write("\n\rServer Response: "); console.log(payload);
    process.stdout.write("Status Code: "); console.log(status); console.log();

    res.status(status).send(payload);
}

module.exports.data2CSV = async (user,host,base,data) =>
{
    let len = data.length;

    if(len)
    {
        let save = util.promisify(fs.writeFile);

        let str1 = null, str2 = null;

        let keys = Object.keys(data[0]);
        
        let klen = keys.length;

        for(let i = 0; i < klen; i++)
        {
            if(str1)
                str1 += quote(keys[i]);
            else
                str1 = quote(keys[i]);

            if(i < (klen - 1))
                str1 += ";"
            else
                str1 += "\n";

            for(let j = 0; j < len; j++)
            {
                let values = data[i];

                if(str2)
                    str2 += quote(values[keys[j]]);
                else
                    str2 = quote(values[keys[j]]);
    
                if(j < (len - 1))
                    str2 += ";"
                else
                    str2 += "\n";
            }
        }

        let sufix, date;
     
        [sufix,date] = dateNaming();

        let filename = `${base}_${sufix}`, type = 4;

        try
        {
            let filepath = `./files/csv/${filename}.csv`;

            let content = str1+str2;     

            let pass = gen(8,false);
          
            let Q = await SQL.INS("REQUESTS",
            {
                fl_type:".csv",
                fl_path:fpath,
                user_id:user,
                dt:date,
            });
            
            if(!Q[0].status)
            {
                if(Q[0].id)
                {
                    let id = Q[0].id

                    await save(filepath,content);

                    let  fpath = path.resolve(filepath);

                    console.log(`${fpath} successfully saved`);

                    let token =  "https://" + host + "/" +  jwt.sign({id},pass,{ expiresIn: 60 * 60 * 24 });

                    let url = token.slice(0,4) + pass + token.slice(4,token.length);
                    
                    return [true,{url}];
                }
                else
                {
                    return [false,{message:"Request id couldn't be retrieved",status:"failure",code:5}];
                }
            }                
            else
            {
                return [false,Q[0]];
            }          
        }
        catch(error)
        {
            return [false,{message:error.toString() + error.stack.toString(),status:"failure",code:4}];
        }  
    }
    else
        return [false,{message:"No data supplied",status:"failure",code:4}];

}

module.exports.downloads = async (req,res) =>
{
    let sendResponse = module.exports.response;

    let file = req.params.file;

    let token = req.params.token;

	if (file)
	{ 
        let compression = req.body.compress;

        let Q = SQL.SEL("fl_path,fl_type",null,"FILES",{id:file});

        if(!Q.status)
        {
            if(Q[0])
            {
                let filepath = Q[0].fl_path, type = Q[0].fl_type, ct, size = 0;

                if(filepath && type)
                {
                    try
                    {
                        let stat = util.promisify(fs.stat);
    
                        let stats = await stat(filepath);
    
                        if(type == ".txt" || type == ".csv")
                            ct = "text/plain";
                        else if(type == ".mp4")
                            ct = "video/mpeg";
                        else
                            ct = "image/jpeg";
            
                        console.log("Attempting  " + filepath + " pipe.");
                        
                        try
                        {
                            let print = (hrstart,size) =>
                            {
                                let hrend = process.hrtime(hrstart);
                        
                                console.log("\n\rDone Streaming " + req.params.file + " from " + req.hostname);
                                
                                console.log("\n\r%d bytes of data sent in %ds %dms",size,hrend[0],hrend[1]/1000000);
                            }
    
                            let stream = fs.createReadStream(filepath), hrstart = process.hrtime();                        
    
                            if(compression && ext == ".jpg")
                            {
                                res.writeHead(200, {'Content-Type': "image/jpeg"});
                                
                                let compress = sharp().rotate().resize(530).jpeg({ mozjpeg: true, quality:60});
                                
                                stream.pipe(compress).on("data",(chunk) => size+=chunk.length).pipe(res);
                            }
                            else
                            {
                                let size = stats.size;
    
                                res.writeHead(200, {'Content-Type': "image/jpeg",'Content-Length':size});       
                
                                stream.pipe(res);
                                   
                            }
                            
                            stream.on("error",(e) =>  
                            {
                                log.errorLog("download","Piping error of file " + filepath + ".\n\r\n\r" + e,1);
                            });

                            stream.on("finish",() => 
                            {
                                print(hrstart,size)
                            });

                        }
                        catch(error)
                        {
                            let e = error.toString();
    
                            if(error.stack)
                                e += error.stack;       
    
                            log.errorLog("download","Piping error of file " + filepath + ".\n\r\n\r" + e,1);
    
                            try
                            {
                                sendResponse(res,500,{message:"piping error",status:"failure",code:4});
                            }
                            catch
                            {}
                        }        
                    }
                    catch(error)
                    {
                        let e = error.toString();
    
                        if(error.stack)
                            e += error.stack;       
    
                        log.errorLog("download","File " + filepath + " can't be found.\n\r\n\r" + e,2);
                        
                        sendResponse(res,404,{message:"File " + filepath + "can't be found.",status:"failure",code:4});
                    }
                }
                else
                {
                    semdResponse(res,500,{message:"Database Integrity or Query Error",status:"failure",code:4}); 
                }        
            }
            else
            {
                sendResponse(res,404,{message:"Requsted element not in database",status:"failure",code:4});
               
            }
        
        }
        else
            sendResponse(res,500,Q);
	
	}
    else if(token)
    {
        if(token.length >= 12)
        {
            let pass = token.slice(4,12);

            let jtoken =  token.slice(0,4) + token.slice(12,token.length);
            
            try
            {
                let j = jwt.verify(jtoken,pass);

                if(j.id)
                {
                    let Q = SQL.SEL("fl_path,fl_type",null,"FILES",{id:j.id});

                    if(!Q.status)
                    {
                        if(Q[0])
                        {
                            let filepath = Q[0].fl_path, type = Q[0].fl_type;

                            if(filepath && type)
                            {
                                try
                                {
                                    let stat = util.promisify(fs.stat);
            
                                    let stats = await stat(filepath);
            
                                    let size = stats.size;
                
                                    if(type == ".csv") 
                                        ct = "text/plain";
                                    else
                                        ct = "application/zip"
                        
                                    res.writeHead(200, {'Content-Type': ct,'Content-Length': size});
                        
                                    console.log("Attempting  " + filepath + " pipe.");
                                    
                                    try
                                    {
                                        let stream = fs.createReadStream(filepath).pipe(res)

                                        stream.on("error",(e) => 
                                        {
                                            log.errorLog("download","Piping error of file " + filepath + ".\n\r\n\r" + e,1);
                                        }) 

                                        stream.on("finish",() => 
                                        {
                                            print(hrstart,size)
                                        });                                       
                                    }
                                    catch(error)
                                    {
                                        let e = error.toString();
                
                                        if(error.stack)
                                            e += error.stack;       
                
                                        log.errorLog("download","Piping error of file " + filepath + ".\n\r\n\r" + e,1);
                                    }        
                                }
                                catch(error)
                                {
                                    let e = error.toString();
                
                                    if(error.stack)
                                        e += error.stack;       
                
                                    log.errorLog("download","File " + filepath + " can't be found.\n\r\n\r" + e,2);
                                    
                                    sendResponse(res,404,{message:"File " + filepath + "can't be found.",status:"failure",code:4});
                                    try
                                    {
                                        sendResponse(res,500,{message:"piping error",status:"failure",code:4});
                                    }
                                    catch
                                    {}
                                }
                            }
                            else
                                sendResponse(res,403,{message:"Bad token",status:"failure",code:4});
                        }
                        else
                        {
                            sendResponse(res,404,{message:"Requsted element not in database",status:"failure",code:4});
                        }
                    }
                    else
                    {
                        sendResponse(res,500,Q);
                    }
                }
                else
                    sendResponse(res,404,{message:"Bad Token",status:"failure",code:4});
               
                
            }
            catch(error)
            {
                switch(error.name)
                {
                    case "TokenExpiredError":
                    {
                        sendResponse(res,401,{message:"Token expired.",status:"unauthroized",code:12});
                        
                        break;
                    }
                    
                    default:
                    {
                        sendResponse(res,401,{message:error,status:"unauthroized",code:12});
                        
                        break;
                    }
                }
            }
            
        }
    }
	else
	{
        sendResponse(res,400,{message:"No resource specified",status:"failure",code:4});
	}
};

module.exports.uploads = async (res,req) =>
{
    let filenames = [], ok = false, code;

    try 
    {
        if(!req.files) 
        {
            res.status(400).send(
            {
                STATUS: "BAD REQUEST",
                REQUEST: "NO FILE UPLOADED"
            });
        } 
        else 
        {
            console.log(req);

            let details = JSON.parse(req.body.details);
            
            /*
            if(details.key && details.key == "hazard")
            {
                if(!TOKEN)
                    TOKEN = randomToken(16);

                details.TOKEN = TOKEN;
            }*/
            
           

            if(true)//(TOKEN && details.TOKEN == TOKEN)
            {
                //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
                let data = req.files.data;

                let Q;
                
                let flag = true;

                let n = 0;
            
                let filename = details.filename;
                
                console.log(filename);
                
                let file = filename;
                
                let f = filename.split('.');
                
                let dots = f.length;

                f[dots] = f[dots - 1];
                
                f[dots - 1] = "";
        
                let extension = "";
                
                extension = f[dots];       
                
                if(extension == "txt" || extension == "mp4" || extension == "png")
                {
                    let path;

                    if(extension ==  txt)
                        path = "./files/historics/";
                    else if(extension == "mp4")
                        path = "./files/media/recordings";
                    else
                        path = "./files/media/snapshots";


                    let exists = util.promisify(fs.access);

                    let save = util.promisify(data.mv);

                    while(flag)
                    {
                        file = f.join('.');

                        file = charRemove(file,'.',dots);

                        try
                        {
                            await exists(path + file, fs.F_OK); 

                            console.log(n.toString() + ". File exists. ");

                            n++;

                            f[dots - 1] = "("+n.toString()+")";
                        }
                        catch(error)
                        {
                            console.log("Saving " + file);

                            await save(path + file);

                            if(extension ==  txt)
                                filenames.push(file);

                            console.log(file + " saved.");

                            let dt = {};

                            dt.fl_name = file;

                            dt.fl_type = data.mimetype;

                            dt.fl_path = path + file;

                            dt.fl_url = "files/" + file;

                            dt.dt = details.dt;

                            dt.reg = new Date().toISOString().toString().replace("T"," ").replace("Z","");

                            dt.journey_id = details.journey_id;

                            Q = await SQL.INS("FILES", dt);
    
                            if(!Q.STATUS)
                                Q = "SUCCEEDED ON MODIFYING DATABASE.";
                            else
                                Q = "FAILED TO MODIFY DATABASE.";

                            flag = false;
                        }
                
                    }
                    
                    
                    //send response
                    /*
                    res.status(200).send(
                    {
                        STATUS: Q,

                        MESSAGE: 'File was successfully uploaded',
                        
                        DATA: 
                        {
                            NAME: file,
                            MIMETYPE: audio.mimetype,
                            SIZE: audio.size
                        }
                    });*/

                    ok = true;

                    code = 200;

                    status =
                        {
                            STATUS: Q,
    
                            MESSAGE: 'Files were successfully uploaded',
                            
                            DATA: 
                            {
                                NAME: file,
                                MIMETYPE: data.mimetype,
                                SIZE: data.size
                            }
                        };
                }
                else
                {
                    console.log("Invalid Format uploaded.");

                    /*
                    res.status(400).send(
                    {
                        STATUS:"BAD REQUEST", 
                        
                        MESSAGE: "PLEASE UPLOAD .mp3 FILES ONLY."
                    });*/

                    code = 400;

                    status = { STATUS:"BAD REQUEST", MESSAGE: "FORMAT"};
                }
            }
            else if (!TOKEN)
            {
                console.log("No Token has been generated; please log in.");

                //res.status(401).send({STATUS:"LOGIN"});

                code = 400;

                status = {STATUS:"LOGIN"};
            }
            else
            {
                console.log("Invalid Token.");

                //res.status(401).send({STATUS:"INVALID"});

                code = 401;

                status = {STATUS:"INVALD"};
            }
        }
    } 
    catch(error) //error11
    {
        errorLog("",error,11);

        //res.status(500).send({STATUS:"ERROR"});

        code = 500;

        status = {STATUS:"FAILURE", MESSAGE:error}
    }

    return [ok,filenames,status,code];
};

module.exports.data = async (res,req,filenames) =>
{
    let readFile = util.promisify(fs.readFile);

    let path = "./files/historics/", file = "", jsons = [], data = {}, result = [], fault = 0;

    let code = 200;

    let fl_name, fl_type, fl_path, fl_url, rl = 0, dt, reg;

    for(let i = 0; i < filenames.length; i++)
    {
        fl_path = path + filenames[i];

        file = readFile(fl_path);

        jsons = file.split("\n\r");

        for(let j = 0; j < jsons.length; j++)
        {
            data = jsons[j];

            process.stdout.write("JSON String: ");
            console.log(data);

            try
            {
                data = JSON.parse(data);
            }
            catch
            {
                console.log("Bad JSON");
            }
            
            data.reg = new Date().toISOString().toString().replace("T"," ").replace("Z","");
            
            let r = sql.INS("HISTORICS",data);

            if(!r.STATUS)
                rl++;
            else
            {
                let error = "Failed to process data: " + JSON.stringify(data);
                
                error +="\n\rFile: " + filenames[i] + " @ line " + rl.toString();
                
                log.errorLog("data",error,1);
            }
        }

        if(rl != 0)
        {
            let r = sql.UPDT("FILES",{rl},{fl_name:filenames[i],ops:""}); 

            result.push({fl_update:r,rl});
    
            if(!r.STATUS)
                console.log("Successfully registered " + rl + " lines read from file  " + filenames[i]);
            else
            {
                let error = "Failed to register the " + rl.toString() + " lines read from file  " + filenames[i];
                
                log.errorLog("data",error,2);
            }     
        }
        else
        {
            fault++;

            if(fault == (filenames.length - 1))
            {
                code = 500;

                result = {STATUS:"FAILURE", MESSAGE:"NO DOCUMENTS WHERE PROCCESSED"};
            }
                
        }
        
           
    }

    return [result,code];
};

module.exports.mailing = async (data,download,test) =>
{   
    let subject, text, html;

    if(test)
    {
        transporter.auth.user = test.user;

        transporter.auth.pass = test.pass;
    }
    
    if(download)
    {
        subject = "Your Download ✔";

        text = `You have requested to download files stored in the server:\n\r
                \n\rURL: ${data.url}`;
            
        html = `<p>You have requested to download files stored in the server:</p>
                <ul>
                    <li style="line-height: 2;"><strong>URL</strong>: ${data.url}</li>
               
                </ul>`;
    }
    else
    {
        subject = "Your Credentials ✔";

        text = `You have requested your credentials for Boat Monitoring:\n\r
                \n\rUsername: ${data.username}
                \n\rYour New Password: ${data.password}`;

        html = `<p>You have requested your credentials for Boat Monitoring App:</p>
                <ul>
                    <li style="line-height: 2;"><strong>Username</strong>: ${data.username}</li>
                    <li><strong>Your New Password</strong>: ${data.password}</li>
                </ul>`;
    }
    // send mail with defined transport object
    let info = await transporter.sendMail(
    {
        from: '"Server" <info@BoatMonitor.com>', // sender address
        to: data.mail, // list of receivers
        subject, // Subject line
        text, // plain text body
        html, // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

module.exports.zipping = async (user,name,targets) =>
{
  let destination = 'C:\\My_Workspace\\Boat_Monitor\\Cloud_Server\\files\\zips\\';
  
  let  getOS = (o) => os.type().toLowerCase().includes(o), params = ["-",destination + name], zip = null;

  params = params.concat(targets);
  
  if(getOS("windows"))
  {
    params[0] = "-cvf";

    console.log(params);

    zip = spawn('tar',params) ;
  }  
  else if(getOS("linux"))
  {
    params[0] = "-r";
    
    console.log(params);

    zip = spawn('zip', params);
  }
    

  if(zip)
  {
    zip.stdout.on('data', (data) => 
    {
      console.log(`stdout: ${data}`);
    });
  
    zip.stderr.on('data', (data) => 
    {
      console.error(`stderr: ${data}`);
    });
    
    zip.on('close', (code) => 
    {
      console.log(`child process exited with code ${code}\n\r`);
      
      if(!code)
      {
        console.log("Operation was successful.");
        
        try
        {
            let filepath = `./files/zips/${name}.zip`;

            let content = str1+str2;     

            let pass = gen(8,false);
          
            let Q = await SQL.INS("REQUESTS",
            {
                fl_type:".zip",
                fl_path:fpath,
                user_id:user,
                dt:date,
            });
            
            if(!Q[0].status)
            {
                if(Q[0].id)
                {
                    let id = Q[0].id

                    await save(filepath,content);

                    let  fpath = path.resolve(filepath);

                    console.log(`${fpath} successfully saved`);

                    let token =  "https://" + host + "/" +  jwt.sign({id},pass,{ expiresIn: 60 * 60 * 24 });

                    let url = token.slice(0,4) + pass + token.slice(4,token.length);
                    
                    return [true,{url}];
                }
                else
                {
                    return [false,{message:"Request id couldn't be retrieved",status:"failure",code:5}];
                }
            }                
            else
            {
                return [false,Q[0]];
            }          
        }
        catch(error)
        {
            return [false,{message:error.toString() + error.stack.toString(),status:"failure",code:4}];
        } 
      }
      else
        console.log("Operation did not succeed");
    });
  }
}
