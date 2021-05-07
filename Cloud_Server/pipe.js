const fs = require('fs');
const util = require('util');
const jwt = require('jsonwebtoken');
const pathm = require("path");
const pg = require('generate-password');
const express = require('express');

const SQL = require('./modules/sql.js');

var data = [{crap1:1,crap2:2,crap3:3},{crap1:4,crap2:7,crap3:9},{crap1:11,crap2:22,crap3:34}];

function quote(str)
{
    return "\"" + str + "\"";
}

function gen(length,symbols)
{
    return pswrd = pg.generate(
    {
        length,
        numbers:true,
        symbols,
        uppercase:true,
        lowercase:true,
        strict:true
    });
}

function dateNaming()
{
    let now = Date.now();

    let date = new Date(now);

    let y = date.getFullYear();

    let m = date.getMonth();

    let d = date.getDate();

    let h = date.getHours();

    let min = date.getMinutes();

    let s = date.getSeconds();

    let z = date.getMinutes();

    let regEX = /T|Z/g;

    return [`${y}${m+1}${d}${h}${min}${s}${z}`,date.toISOString().replace(regEX," ")];    
}

async function data2CSV(host,base,data)
{
    let len = data.length;

    if(len)
    {
        let save = util.promisify(fs.writeFile);

        let str1 = null, str2 = null;

        let keys = Object.keys(data[0]);
        
        let klen = keys.length;

        for(let i = 0; i < klen; i++)
        {
            if(str1)
                str1 += quote(keys[i]);
            else
                str1 = quote(keys[i]);

            if(i < (klen - 1))
                str1 += ";"
            else
                str1 += "\n";

            for(let j = 0; j < len; j++)
            {
                let values = data[i];

                if(str2)
                    str2 += quote(values[keys[j]]);
                else
                    str2 = quote(values[keys[j]]);
    
                if(j < (len - 1))
                    str2 += ";"
                else
                    str2 += "\n";
            }
        }

        let sufix, date;
     
        [sufix,date] = dateNaming();

        let filename = `${base}_${sufix}`;

        try
        {
            let filepath = `./files/csv/${filename}.csv`;

            let content = str1+str2;

            await save(filepath,content);
            
            let  path = pathm.resolve(filepath);

            console.log(`${path} successfully saved`);

            let pass = gen(8,false);

            let token =  "https://" + host + "/" +  jwt.sign({filename},pass,{ expiresIn: 60 * 60 * 24 });
           
            let url = token.slice(0,4) + pass + token.slice(4,token.length);
 
            
            let Q = await SQL.INS("FILES",
            {
                fl_name:filename,
                fl_type:".csv",
                fl_path:path,
                fl_url:url,
                dt:date,
                reg:date
            });

            if(!Q[0].status)
                return [true,{url}];
            else
            {
                Q[0].url = url;

                return [true,Q[0]]
            }          
        }
        catch(error)
        {
            return [false,{message:error.toString() + error.stack.toString(),status:"failure",code:4}]
        }  
    }
    else
        return [false,{message:"No data supplied",status:"failure",code:4}];

}

setImmediate(async () =>
{
    let token,res;

    [res,token] = await data2CSV("https://orbittas.com","USERS_{}",data);

    console.log([res,token]);

    let pass = token.slice(4,12);

    token = token.slice(0,4) + token.slice(12,token.length)

    console.log({pass,token});

    console.log(jwt.verify(token,pass));


});

const app =  express();

