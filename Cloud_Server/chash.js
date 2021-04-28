const bcrypt = require('bcrypt');

const plainText = "#B04tTr4ck3r++";

const hash = '$2b$10$wLj4ndTj2fr5tSjcU4tUYu728JpxjlngTBFrFI5UeZDFeccUk6BPy';

var result;

setImmediate(async () =>
{
    result = await bcrypt.compare(plainText, hash);

    if(result)
        console.log("CAT!");
    else
        console.log("SHET!");
});