const sql = require('mysql2')

function DBconnection()
{
  var connection = sql.createConnection(
  {
    host: "localhost",
    user: "orbittas_b",
    password: "#B04tTr4ck3r++",
    database: "BOAT_MONITOR"
  });

  connection.on("error",(err) => {console.log("CAT1:" + err);});

  return connection;
}

setImmediate(async () =>
{
   let DB = DBconnection();
   try
   {
        DB.connect(async (err) =>
        {
            if(err)
                console.log("CAT:" + err);
            else
            {
                let [catto,polpo] = await DB.promise().query('SELECT * FROM USERS');

                console.log(JSON.parse(JSON.stringify(catto)));
                DB.end();
            }
        });

       

   }
   catch(error)
   {
       console.log("CAT:" + error)
   }


  
});