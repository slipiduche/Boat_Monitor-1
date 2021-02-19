/*******************************************************************************
********************************************************************************
*                             Request Handling                                 *
********************************************************************************
*******************************************************************************/

/**********************************MODULES*************************************/
const fs   = require('fs');

const path = require('path');

const util = require('util');
const { resourceLimits } = require('worker_threads');

const log = require('./logging.js');

const sql = require('./sql.js');

const dir  = ["./files/historics/","./files/media/recordings/","./files/media/snapshots/"];


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

module.exports.downloads = async (res,req) =>
{
    let file = req.params.file;

	let reg = parseInt(req.params.reg);

	//Si el nombre no es nulo.
	if (file!='' && (reg == 0 || reg == 1))
	{
		//Agrego el path local al file.
		file = dir[reg]+file;

		//Variable para el filesize.
		let statFile;

		//Intengo obtener el archivo.
		try
		{
			//Traigo atributos del archivo.
			statFile = fs.statSync(file);

            let ext = path.extname(file);

            let ct;

            if(ext == "txt")
                ct = "text/plain";
            else if(ext == "mp4")
                ct = "video/mpeg";
            else
                ct = "image/png";

			//Armo headers.
			res.writeHead(200, {'Content-Type': ct,'Content-Length': statFile.size});

			console.log("Piping " + file + ".");

			//Devuelvo streams del archivo atravez de un pipe.
      let stream = fs.createReadStream(file).pipe(res);
      
      let hrstart = process.hrtime();

      stream.on('finish', () =>
      {
        let hrend = process.hrtime(hrstart);

        console.log("Done Streaming " + req.params.file + " on host " + req.get('host'));
        console.log("%ds %dms",hrend[0],hrend[1]/1000000);

      });
      
		}
		catch(error)
		{
			console.log("File " + file + " can't be found.");

			log.errorLog("download","File " + file + " can't be found.\n\r\n\r" + error.toString(),1);

			res.status(404).send({STATUS:"NOT FOUND",MESSAGE:"FILE " + file + " CAN'T BE FOUND."});
		}
	}
	else
	{
		console.log("Bad request; file not specified.");

		log.errorLog("download","Bad request; file not specified.",2);

		res.status(400).send({STATUS:"BAD REQUEST", MESSAGE:"FILE NOT SPECIFIED."});
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

module.exports.journey = async (req,res) =>
{
    //{"id":"","journey_start":"","journey_end":"",}

    let result;

    if(req.body.id)
    {
        let end = req.body.journey_end;

        result = sql.UPDT("JOURNEYS",{journey_end:end},{id:req.body.id,ops:""});      
    }
    else
    {
        let start = req.body.journey_start;

        result = sql.INS("JOURNEYS",{journey_start:start},"");
    }

    if(!result.status)
        res.status(200).json(result);
    else
        res.status(500).json(result);
};
