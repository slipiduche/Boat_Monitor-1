const bcrypt = require('bcrypt');

const plainText = '';

const hash = '$2b$10$tKgldLwEBI7vjXKcKWue/Of636wzx0xwJ/BsywDERHS2bwodNO1R6';

var result;

setImmediate(async () =>
{
    result = await bcrypt.compare(plainText, hash);

    if(result)
        console.log("CAT!");
    else
        console.log("SHET!");
});