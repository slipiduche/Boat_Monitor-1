var stdin = process.stdin.resume(); 
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
});



