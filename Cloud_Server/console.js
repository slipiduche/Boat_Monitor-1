const a = require('async');

const SQL = require('./modules/sql.js');
/*var stdin = process.stdin.resume(); 
//require('tty').setRawMode(true);    

var id = 1;

var crap =  {};

crap[id.toString()] = setTimeout(() => console.log("get catted!"), 3000);


console.log(crap);

stdin.on('data', function (chunk) {
  process.stdout.write('Get Chunk: ' + chunk + '\n');

  if(chunk == 1)
  {
      console.log("clearing..");

      clearTimeout(crap[id.toString()]);
      
      delete crap[id.toString()]
    
      console.log(crap);
      
      console.log("clear!");
  }
    //crap["1"].
  //if(key && key.enter) console.log("cat");

  //else if (key && key.ctrl && key.name == 'c') process.exit();
});*/

async function awhile(params,callback,nxt)
{
  let loop;

  [loop,params] = await callback(params);

  if(loop)
    awhile(params,callback);
  else 
    nxt(params);
}

var x =  true;

setTimeout(() =>
{
  x = false;

  console.log("CAT");
},1000)

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

setImmediate(async () =>
{
  let i = 0;
  
  async function for1()
  {
    if(i < 1)
    {
      await SQL.SEL("*",null,"BOATS");
    }
    
    i++;
    
    //await timeout(200);

    if(x)
      await for1();
  }

  try
  {
    await for1();
  }
  catch(error)
  {

  }
 

  console.log(i);
  

  console.log(7);

  
});

console.log(1);

