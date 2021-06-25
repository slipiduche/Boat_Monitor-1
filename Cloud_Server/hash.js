const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainText = '';


bcrypt.hash(plainText, saltRounds)
 .then(hash => {
    console.log(hash);
 });