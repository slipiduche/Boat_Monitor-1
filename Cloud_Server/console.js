const os = require('os');

let mod = "cat";

let str = `I am your ${mod}`;

console.log(str);


let s = "!@#$%^&*()_-=+/*{}[]\"';,<>.?"

console.log("Length: " + s.length);


function isDigit(char)
{
    if(char >= '0' && char <= '9')
        return true;
    else
        return false;
}

let sys = "crap"//(os.type());

sys.toLowerCase().includes("windows");
console.log();

let ar = "eiubfiewb";

if(!Array.isArray(ar))
{
  let aux = ar;

  ar = [];

  ar.push(aux);
}

console.log(ar);