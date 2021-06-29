const delay = ms => new Promise(resolve => setTimeout(resolve, ms))



setImmediate(async () =>
{
    start = process.hrtime();

    await delay(1) /// waiting 1 second.

    console.log(process.hrtime(start)[1]/1000000);

})
