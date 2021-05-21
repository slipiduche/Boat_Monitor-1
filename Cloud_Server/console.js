const FK =
{
  JOURNEYS:{USERS:["JOURNEYS.start_user","JOURNEYS.end_user"],BOATS:["JOURNEYS.boat_id"]}
}
const uin = ["names"], bin = ["boat_name"];

const tab = "JOURNEYS";

const retrieve = ["a","b","c"];

var inner = 
[
  {USERS:2,BOATS:1, FILES:3,CATS:1},
  [uin,uin,bin,bin,bin,uin,uin],
  [[" start_user_names"],[" end_user_names"],[""],[""],[""],[""],[""]]
]

let elements = retrieve.map((el) => tab + '.' + el)

let values = inner[0], keys = Object.keys(values);

let len = keys.length;

let sum = 0;

let join = "";

let cat ;
for(let i = 0; i < len; i++)
{    
    let n = values[keys[i]];

    for(let j = 0; j < n; j++)
    {
      let prefix = keys[i][0] + (j + 1).toString();

      let arg = [];

      inner[1][j + sum].forEach((item,index) => 
      {
        arg[index] = prefix  + "." + item + inner[2][j+sum][index]
      });

      elements = elements.concat(arg);

      if(i < 2)
        join += "INNER JOIN " + keys[i] + " AS " + prefix + " ON " + FK[tab][keys[i]][j] + " = " + prefix +".id \n";
    }
      

    sum += n;
}

console.log(elements);

console.log(join);

let params = {ini:"cat",end:"dog"}

range = [params.ini,params.end];

        delete params.ini;

        delete params.end;

console.log(range);

{
  "url":"string",
  "message":"Unable to send mail, but URL generated. Valid for 24 hours only",
  "status":"undelivered",
  "code":13
}

{
  "url":"string",
  "message":"Travel files sucessfully zipped and URL sent. URL valid for 24 hours only ",
  "status":"success",
  "code":1
}