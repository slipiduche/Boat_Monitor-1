const jwt = require('jsonwebtoken');

var token = jwt.sign({ foo: 'bar' }, 'shhhhh',{ expiresIn: 60 * 60 });
 token += 2;

console.log(token);

let id = token[token.length -1];

token = token.slice(0,token.length-1)

console.log(token);

var token2 = jwt.verify(token,'shhhhh');

console.log(id);
console.log(token2);

let rj = {crap1:"efew",crap2:"efnwoen",crap3:"ewfinwe"};

console.log(rj);

console.log(Object.keys(rj));

delete rj.crap1;

console.log(rj);

delete rj.crap3;

console.log(rj);
