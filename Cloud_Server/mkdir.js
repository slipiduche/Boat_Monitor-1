const util = require('util');

const fs = require('fs');


setImmediate(async () =>
{   
    var mkdir = util.promisify(fs.mkdir);
    
    try
    {
        await mkdir("./files/csv");

        console.log("CAT!")
    }
    catch(error)
    {
        console.log(error);
    }
})
