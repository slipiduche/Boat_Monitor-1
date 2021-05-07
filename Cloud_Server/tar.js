const { spawn } = require('child_process');
let t1 = 'files\\media\\snapshots\\J1'
let t2 = 'files\\historics\\J1'
let t3 = 'files\\csv'
let destination = 'C:\\My_Workspace\\Boat_Monitor\\Cloud_Server\\files\\zips\\';
let OS
let  zip;


spawn('tar', ['-cvf',destination + "stuff.zip",t1,t2,t3]);


tar.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  
  tar.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  
  tar.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });