const AdmZip = require("adm-zip");
const { set } = require("lodash");


var zip = new AdmZip();

zip.addLocalFile('C:\\Users\\CLIM-DESKTOP\\Downloads\\IMG_20210506_140531547.jpg');

zip.addLocalFile('C:\\Users\\CLIM-DESKTOP\\Downloads\\182809145_5375246449212262_8916665102384602383_n.jpg');

zip.addLocalFile('C:\\Users\\CLIM-DESKTOP\\Downloads\\183014890_305262914302375_6700715570746623260_n.jpg');

setImmediate(() =>
{
    await zip.writeZip('C:\\Users\\CLIM-DESKTOP\\Downloads\\img.zip');

    console.log("done")
})

