/*******************************************************************************
********************************************************************************
*                                 SQL QUERIES                                  *
********************************************************************************
*******************************************************************************/

/**********************************MODULES*************************************/

const mysql = require('mysql2');

const fs   = require('fs');

const util = require('util');

const log = require('./logging.js');

/*********************************FUNCTIONS***********************************/

function DBconnection()
{
  var connection = mysql.createConnection(
  {
    host: "localhost",
    user: "orbittas_b",
    password: "#B04tTr4ck3r++",
    database: "BOAT_MONITOR"
  });

  connection.on("error",(err) => 
  {
    //console.log(err);
  });

  return connection;
}

/**********************************EXPORTS************************************/

/*SELECT QUERY*/

module.exports.SEL = async function SEL(S,REST,TABLE,WHERE,RANGE,LAST,JOIN)
{  
  let DB = DBconnection(), r = "";

  let q1 = "SELECT ",q2 = " FROM " + TABLE, q3 = " WHERE ", Q, params = [];

  let keys, filters = null;

  if(WHERE)
  {
    keys = Object.keys(WHERE);
    
    filters = keys.length;
  }
  
  DB.connect( (error) =>
  {
    if(error) //sql-error3
    {
      try
      {
        DB.destroy();
      }
      catch
      {}
      
      log.errorLog("sql",error,3);

      r = {message:error,status:"failure",code:5};
    }  
  });

  if(r.STATUS)
    return r;
  
  console.log("SELECT");

  if(filters)
  {
    let iter = filters;

    for(let i = 0; i < iter; i++)
    {      
      let values = [], value = WHERE[keys[i]];
      
      if(Array.isArray(value))
        values = value;
      else
        values.push(value);

      let len = values.length;

      if(i > 0)
        q3 += " AND ";
      
      if(JOIN)
        q3 += TABLE + '.';

      q3 +=  keys[i] + " IN ( ";

      for(let j = 0; j < len; j++)
      {
        params.push(values[j]);

        if(j > 0)
          q3 += ",";

        q3 += "?"; 
      }
      
      q3 += ")";     
    }
  }

  if(REST)
  {
    if(filters)
      q3 +=  " AND ";

    q3 += "usertype <= ?";

    params.push(REST);
  }

  if(RANGE)
  {
    if(filters || REST)
      q3 +=  " AND ";

    if(TABLE == "JOURNEYS")
    {
      q3 += "((ini >= ? AND ini <= ?) ";
      
      params.push(RANGE[0]);  params.push(RANGE[1]);

      q3 += "OR (ed >= ? AND ed <= ?));"
    
      params.push(RANGE[0]);  params.push(RANGE[1]);
    }
    else
    {
      q3 += "dt >= ? AND dt <= ?;";

      params.push(RANGE[0]);  params.push(RANGE[1]);
    }
  }
  
  Q = q1 + S + q2;

  if(JOIN)
    Q += " \n" + JOIN;
    
  if(LAST && filters)
  {
    let q4 = " WHERE id IN (SELECT MAX(id) FROM " + TABLE;

    let grp = " GROUP BY ";

    let iter = filters;

    for(let i = 0; i < iter; i++)
    {
      if(i > 0)
        grp += ",";

      grp += keys[i];
    }

    q4 +=  q3 + grp + ")";

    Q += q4;
  }
  else if(filters || RANGE || REST)
    Q += q3;

  Q += ";";

  console.log(Q);

  process.stdout.write("Params: "); console.log(params);

  try
  {
    let [result,fields] = await DB.promise().query(Q,params);

    r = JSON.parse(JSON.stringify(result));  
  }
  catch(error) //sql-error4
  {
    log.errorLog("sql",error,4);
    
    r = {message:error,status:"failure",code:5};
  }
  
  try
  {
    DB.destroy();
  }
  catch
  {}

  console.log(r);

  return r;
}

/*INSERT QUERY*/

module.exports.INS = async function INS(TABLE,COLS)
{
  let DB = DBconnection(), r = "";
  
  let q1 = "INSERT INTO " + TABLE, q2 = " (", q3 = "VALUES (", Q, params = [];

  let keys = Object.keys(COLS), values = COLS;

  let columns = keys.length;

  DB.connect( (error) =>
  {
    if(error)
    {
      try
      {
        DB.destroy();
      }
      catch
      {}
      
      log.errorLog("sql",error,5); //sql-error5
      
      r = {message:error,status:"failure",code:5};
    }  
  });

  if(r.STATUS)
    return r;

  console.log("INSERT");

  for(let i = 0; i < columns; i++)
  {
    if(i > 0)
    {
      q2 += ","; q3 += ","
    }

    q2 += keys[i];
    
    q3 += "?";

    params.push(values[keys[i]]);
  }

  q2 += ") "; q3 += ");";

  Q = q1 + q2 + q3;

  console.log(Q);

  process.stdout.write("Params: "); console.log(params);

  try
  {
    let result = await DB.promise().query(Q,params);

    r = JSON.parse(JSON.stringify(result));
  }
  catch(error) //sql-error6
  {
      log.errorLog("sql",error,6);

      r = {message:error,status:"failure",code:5};
  }

  try
  {
    DB.destroy();
  }
  catch
  {}

  console.log(r);

  return r;
}

/*UPDATE QUERY*/

module.exports.UPD = async function UPD(TABLE,COLS,WHERE)
{
  let DB = DBconnection(), r = "";

  let q1 = "UPDATE " + TABLE, q2 = " SET ", q3, Q, params = [];

  if(WHERE)
  {
    if(Array.isArray(WHERE))
      values = WHERE;
    else
      values.push(WHERE);

    q3 = " WHERE id IN (";

    for(let i = 0; i < WHERE.length; i++)
    {
        q3 += WHERE.toString();

        if(i < WHERE.length - 1)
          q3 += ",";
    }

    q3 += ")";
  }
    

  let keys = Object.keys(COLS), values = COLS;
    
  DB.connect( (error) =>
  {
    if(error)
    {
      try
      {
        DB.destroy();
      }
      catch
      {}
      
      log.errorLog("sql",error,7); //sql-error7

      r = {message:error,status:"failure",code:5};
    }  
  });

  if(r.STATUS)
    return r;

  console.log("UPDATE");
 
  let iter = keys.length;

  for(let i = 0; i < iter; i++)
  {      
    let value = values[keys[i]];
    
    if(i > 0)
      q2 += ",";

    q2 +=  keys[i] + " = ?";
    
    params.push(value);
  }

  Q = q1 + q2;
  
  if(WHERE) 
    Q += q3;
  
  Q += ";";

  console.log(Q);

  process.stdout.write("Params: "); console.log(params);
  
  try
  {
    let result = await DB.promise().query(Q,params);

    r = JSON.parse(JSON.stringify(result));

    if(r[0].affectedRows == 0)
      r = {message:"Either database entry doesn't exists or no new values where designated",status:"unchanged",code:3};

  }
  catch(error) //sql-error8
  {
      log.errorLog("sql",error,8);

      r = {message:error,status:"failure",code:5};
  }

  try
  {
    DB.destroy();
  }
  catch
  {}

  console.log(r);

  return r;
}

/*DELETE QUERY*/

module.exports.DEL = async function DEL(TAB,WHERE)
{ 
  var DB = DBconnection(), r = "";

  DB.connect( (error) =>
  {
    if(error)
    {
      try
      {
        DB.destroy();
      }
      catch
      {}
      
      log.errorLog("sql",error,9); //sql-error9

      r = {message:error,status:"failure",code:5};
    }  
  });


  if(r.STATUS)
    return r;
  
  console.log("DELETE");

  let Q = TAB + " WHERE ID = " + WHERE.toString();
  
  try
  {
    let result = await DB.promise().query("DELETE FROM " + Q + ";");
    
    r = JSON.parse(JSON.stringify(result));     
  }
  catch(error) //sql-error10
  { 
    log.errorLog("sql",error,10);

    r = {message:error,status:"failure",code:5};
  }

  try
  {
    DB.destroy();
  }
  catch
  {}

  console.log(r);

  return r;
}

module.exports.PROC = async (PROC,COLS) =>
{
  let DB = DBconnection(), r = "";
  
  let q1 = "CALL " + PROC, q2 = " (", Q, params = [];

  let keys = Object.keys(COLS), values = COLS;

  let columns = keys.length;

  DB.connect( (error) =>
  {
    if(error)
    {
      try
      {
        DB.destroy();
      }
      catch
      {}
      
      log.errorLog("sql",error,5); //sql-error5
      
      r = {message:error,status:"failure",code:5};
    }  
  });

  if(r.STATUS)
    return r;

  console.log("PROCEDURE");

  for(let i = 0; i < columns; i++)
  {
    if(i > 0)
    {
      q2 += ","; 
    }

    q2 += "?";

    params.push(values[keys[i]]);
  }

  q2 += ");";
  
  Q = q1 + q2;

  console.log(Q);

  process.stdout.write("Params: "); console.log(params);

  try
  {
    let result = await DB.promise().query(Q,params);

    r = JSON.parse(JSON.stringify(result));
  }
  catch(error) //sql-error6
  {
      log.errorLog("sql",error,6);

      r = {message:error,status:"failure",code:5};
  }

  try
  {
    DB.destroy();
  }
  catch
  {}

  console.log(r[0][0]);
  
  console.log(r[0][1]);

  console.log(r[1]);

  return r;
}