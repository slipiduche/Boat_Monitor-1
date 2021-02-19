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
  var con = mysql.createConnection({
  host: "localhost",
  user: "orbittas",
  password: "#B04tTr4ck3r++",
  database: "BOAT_MONITOR"
  });

  return con;
}

/**********************************EXPORTS************************************/

/*SELECT QUERY*/

module.exports.SEL = async function SEL(S,TABLE,WHERE)
{  
  let DB = DBconnection(), r = "";

  let q1 = "SELECT ",q2 = " FROM " + TABLE, q3 = " WHERE ", Q;

  let keys = Object.keys(S), wkeys = "", ops = 0, conds = "";

  DB.connect( (error) =>
  {
    if(error) //sql-error3
    {
      try
      {
        DB.end();
      }
      catch
      {

      }
      
      errorLog("sql",error,3);

      r = {}; r.STATUS = error;
    }  
  });

  if(r.STATUS)
    return r;
  
  console.log("SELECT");

  if(WHERE)
  {
    wkeys = Object.keys(WHERE);

    if(WHERE.ops)
      ops = WHERE.ops.length;

    if(WHERE.conds)
      conds = WHERE.conds.split(',');
  }

  let columns = keys.length, conditions = wkeys.length, iter;

  if(columns > conditions)
    iter = columns;
  else
    iter = conditions;

  for(let i = 0; i < iter; i++)
  {
    if(i <= (columns - 1))
      q1 += S[keys[i]];
    if(i <= (conditions - 2))
    {
      if(!conds)
        q3 += wkeys[i] +  " = ";
      else
        q3 += wkeys[i] +  " " + conds[i] + " ";
      
    }
      q3 += wkeys[i] +  " = ";

    if(i <= (conditions - 2) && isNaN(WHERE[wkeys[i]]))
      q3 += "'" + WHERE[wkeys[i]] + "'";
    else if(i <= (conditions - 2))
      q3 += WHERE[wkeys[i]];
      
    if(i < (columns - 1))
      q1 += ",";    
    if(i < ops)
    {
      if(WHERE.ops[i] == "&")
        q3 += " AND ";
      else if(WHERE.ops[i] == "|")
        q3 += " OR ";
    }
  }

  Q = q1 + q2;
  
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
    errorLog("sql",error,4);
    
    r = {}; r.STATUS = error;
  }
  
  DB.end();

  console.log(r);

  return r;
}

/*INSERT QUERY*/

module.exports.INS = async function INS(TABLE,COLS)
{
  let DB = DBconnection(), r = "";
  
  let q1 = "INSERT INTO " + TABLE, q2 = " (", q3 = "VALUES (", Q;

  let keys = Object.keys(COLS), values = Object.values(COLS);

  let columns = keys.length;

  DB.connect( (error) =>
  {
    if(error)
    {
      try
      {
        DB.end();
      }
      catch
      {}
      
      errorLog("sql",error,5); //sql-error5
      
      r = {}; r.STATUS = error;
    }  
  });

  if(r.STATUS)
    return r;

  console.log("INSERT");

  for(let i = 0; i < columns; i++)
  {
    q2 += keys[i];

    if(isNaN(values[i]))
      q3 += "'" + values[i] + "'";
    else
      q3 += values[i];

    if(i != (columns - 1))
    {
      q2 += ","; q3 += ","
    }

  }

  q2 += ") "; q3 += ")";

  Q = q1 + q2 + q3 + ";";

  console.log(Q);

  try
  {
    let result = await DB.promise().query(Q);

    r = JSON.parse(JSON.stringify(result));
  }
  catch(error) //sql-error6
  {
      errorLog("sql",error,6);

      r = {}; r.STATUS = error;   
  }

  DB.end();

  console.log(r);

  return r;
}

/*UPDATE QUERY*/

module.exports.UPDT = async function UPDT(TABLE,COLS,WHERE)
{
  let DB = DBconnection(), r = "";

  let q1 = "UPDATE " + TABLE, q2 = " SET ", q3 = " WHERE ", Q;

  let keys = Object.keys(COLS), values = Object.values(COLS);

  let wkeys = "", wvalues = "", ops = 0;
    
  DB.connect( (error) =>
  {
    if(error)
    {
      try
      {
        DB.end();
      }
      catch
      {}
      
      errorLog("sql",error,7); //sql-error7

      r = {}; r.STATUS = error;
    }  
  });

  if(r.STATUS)
    return r;

  console.log("UPDATE");

  if(WHERE)
  {
    wkeys = Object.keys(WHERE);
    wvalues = Object.values(WHERE);

    if(WHERE.ops)
      ops = WHERE.ops.length;
  }

  let columns = keys.length, conditions = wkeys.length, iter;

  if(columns > conditions)
    iter = columns;
  else
    iter = conditions;

  for(let i = 0; i < iter; i++)
  {
    if(i <= (columns - 1))
      q2 += keys[i] + " = ";
    if(i <= (conditions - 2))
      q3 += wkeys[i] +  " = ";

    if(i <= (columns - 1) && isNaN(values[i]))
      q2 += "'" + values[i] + "'";
    else if(i <= (columns - 1))
      q2 += values[i];
    if(i <= (conditions - 2) && isNaN(wvalues[i]))
      q3 += "'" + wvalues[i] + "'";
    else if(i <= (conditions - 2))
      q3 += wvalues[i];
      
    if(i < (columns - 1))
      q2 += ",";    
    if(i < ops)
    {
      if(WHERE.ops[i] == "&")
        q3 += " AND ";
      else if(WHERE.ops[i] == "|")
        q3 += " OR ";
    }
  }

  Q = q1 + q2;
  
  if(WHERE)
    Q += q3;
    
  Q += ";";

  console.log(Q);
  
  try
  {
    let result = await DB.promise().query(Q);

    r = JSON.parse(JSON.stringify(result));
  }
  catch(error) //sql-error8
  {
      errorLog("sql",error,8);

      r = {}; r.STATUS = error;
  }

  DB.end();

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
        DB.end();
      }
      catch
      {}
      
      errorLog("sql",error,9); //sql-error9

      r = {"STATUS":error};
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
    errorLog("sql",error,10);

    r = {};  r.STATUS = error;
  }

  DB.end();

  console.log(r);

  return r;
}