const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainText = 'p<RhA7#X_LWBB(O_0&<a,D/,f#2")7B+';


bcrypt.hash(plainText, saltRounds)
 .then(hash => {
    console.log(hash);
 });