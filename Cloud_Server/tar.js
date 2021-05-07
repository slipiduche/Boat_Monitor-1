const os = require('os');
const { spawn } = require('child_process');
let t1 = 'files/media/snapshots'
let t2 = 'files/historics'
let t3 = 'files/csv'

let targets = [t1,t2,t3];

let name = "test.zip";

async function zipping(name,targets)
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
        console.log("Operation was successful.");
      else
        console.log("Operation did not succeed");
    });
  }

}

zipping(name,targets);
