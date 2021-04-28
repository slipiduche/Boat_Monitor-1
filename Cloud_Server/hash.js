const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainText = "#B04tTr4ck3r++";


bcrypt.hash(plainText, saltRounds)
 .then(hash => {
    console.log(hash);
 });