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
const { toNamespacedPath } = require('path');

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

  connection.on("error",(err) => {console.log(err);});

  return connection;
}

/**********************************EXPORTS************************************/

/*SELECT QUERY*/

module.exports.SEL = async function SEL(S,EX,TABLE,WHERE,RANGE)
{  
  let DB = DBconnection(), r = "";

  let q1 = "SELECT ",q2 = " FROM " + TABLE, q3 = " WHERE ", Q;

  let keys = null;

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

  if(WHERE)
  {
    keys = Object.keys(WHERE);

    let iter = key.length;

    for(let i = 0; i < iter; i++)
    {      
      let value = WHERE[keys[i]];

      if(isNaN(value))
        value = "'" + value +"'";
      else
        value = value.toString();

      if(i > 0)
        q3 += " AND ";

      q3 =  keys[i] + " = " + value;
      
    }
  }

  if(RANGE)
  {
    if(WHERE)
      q3 +=  " AND ";

    if(TABLE == "JOURNEYS")
    {
      q3 += "((ini >= '" + RANGE[0] + "' AND ini <= '" + RANGE[1] + "') ";

      q3 += "OR (ed >= '" + RANGE[0] + "' AND ed <= '" + RANGE[1] + "'));"
    }
    else
    {
      q3 += "dt >= '" + RANGE[0] + "' AND dt <= '" + RANGE[1] + "';";
    }
  }

  Q = q1 + S + q2 + TABLE;

  if(WHERE)
    Q += q3;
    
  Q += ";";

  console.log(Q);

  try
  {
    let [result,fields] = await DB.promise().query(Q);

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
  
  let q1 = "INSERT INTO " + TABLE, q2 = " (", q3 = "VALUES (", Q;

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

    if(isNaN(values[keys[i]]))
      q3 += "'" + values[keys[i]] + "'";
    else
      q3 += values[keys[i]];

  }

  q2 += ") "; q3 += ");";

  Q = q1 + q2 + q3;

  console.log(Q);

  try
  {
    let result = await DB.promise().query(Q);

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

  let q1 = "UPDATE " + TABLE, q2 = " SET ", q3 = " WHERE id = " + WHERE.toString(), Q;

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
 
  let iter = key.length;

  for(let i = 0; i < iter; i++)
  {      
    let value = values[keys[i]];
    
    if(i > 0)
      q2 += ",";

    if(isNaN(value))
      value = "'" + value +"'";
    else
      value = value.toString();

    q2 =  keys[i] + " = " + value;
    
  }
  Q = q1 + q2 + q3 + "";

  console.log(Q);
  
  try
  {
    let result = await DB.promise().query(Q);

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