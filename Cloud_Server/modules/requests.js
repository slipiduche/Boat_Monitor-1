/*******************************************************************************
********************************************************************************
*                             Request Handling                                 *
********************************************************************************
*******************************************************************************/

/**********************************MODULES*************************************/
const fs   = require('fs');

const util = require('util');
const { resourceLimits } = require('worker_threads');

const log = require('./logging.js');

const sql = require('./sql.js');

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
/**********************************EXPORTS************************************/

module.exports.uploads = async (res,req) =>
{
    let filenames, ok = false;

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
            let details = JSON.parse(req.body.details);
            
            /*
            if(details.key && details.key == "hazard")
            {
                if(!TOKEN)
                    TOKEN = randomToken(16);

                details.TOKEN = TOKEN;
            }*/
            
            console.log(req);

            if(true)//(TOKEN && details.TOKEN == TOKEN)
            {
                //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
                let txt = req.files.txt;
                
                let Q;
                
                let flag = true;

                let n = 0;
                
                let path = "./files/historics/";
            
                let filename = details.filename;
                
                console.log(filename);

                filename = filename.replace(/ /g,'_');

                console.log(filename);
                
                let file;
                
                let f = filename.split('.');

                if(filename.length > 26)
                {
                    let l = f.length;

                    if(f[l-1].length >= 25)
                        file = filename.slice(0,22) + ".weird";
                    else
                        file = filename.slice(0,25 - f[l-1].length) + "." + f[l-1];

                    console.log(file);

                    f = file.split('.');
                }
                else
                    file = filename;
                
                let dots = f.length;

                f[dots] = f[dots - 1];
                
                f[dots - 1] = "";
        
                let extension = "";
                
                extension = f[dots];       
                
                if(extension == "mp3")
                {
                    let exists = util.promisify(fs.access);

                    let save = util.promisify(audio.mv);

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

                            console.log(file + " saved.");

                            let dt = {};

                            dt.FIELD1 = details.song;

                            dt.FIELD2 = details.artist;

                            dt.FIELD3 = file;

                            Q = await SQL.INS("MUSIC", dt);
    
                            if(!Q.STATUS)
                                Q = "SUCCEEDED ON MODIFYING DATABASE.";
                            else
                                Q = "FAILED TO MODIFY DATABASE.";

                            flag = false;
                        }
                
                    }
                    
                    
                    //send response
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
                    });

                    ok = true;
                }
                else
                {
                    console.log("Bad request; please upload .mp3 files only.");

                    res.status(400).send(
                    {
                        STATUS:"BAD REQUEST", 
                        
                        MESSAGE: "PLEASE UPLOAD .mp3 FILES ONLY."
                    });
                }
            }
            else if (!TOKEN)
            {
                console.log("No Token has been generated; please log in.");

                res.status(401).send({STATUS:"LOGIN"});
            }
            else
            {
                console.log("Invalid Token.");

                res.status(401).send({STATUS:"INVALID"});
            }
        }
    } 
    catch(error) //error11
    {
        errorLog("",error,11);

        res.status(500).send({STATUS:"ERROR"});
    }

    return [ok,filenames];
}

module.exports.data = async (res,req,filenames) =>
{
    let readFile = util.promisify(fs.readFile);

    let path = "./files/historics/", file = "", jsons = [], data = {}, result;

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

            result = sql.INS("HISTORICS",data);

            if(!result.STATUS)
                rl++;
            else
            {
                let error = "Failed to process data: " + JSON.stringify(data);
                
                error +="\n\rFile: " + filenames[i] + " @ line " + rl.toString();
                
                log.errorLog("data",error,1);
            }
        }

        result = sql.UPDT("FILES",{rl},{fl_name:filenames[i],ops:""});

        if(!result.STATUS)
            console.log("Successfully registered " + rl + " lines read from file  " + filenames[i]);
        else
        {
            let error = "Failed to register the " + rl.toString() + " lines read from file  " + filenames[i];
            
            log.errorLog("data",error,2);
        }          
    }

}