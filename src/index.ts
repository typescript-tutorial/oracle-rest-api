import {json} from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import OracleDB from 'oracledb';
import {createContext} from './init';
import {route} from './route';

dotenv.config();

const app = express();

const port = process.env.PORT;
const mongoURI = process.env.MONGO_URI;
const mongoDB = process.env.MONGO_DB;

export const cfPool={
  user: 'c##vinasupport',
  password: '123456',
  connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(Host=localhost)(Port=1521))(CONNECT_DATA=(SID=ORCL)))',
  poolMin: 10,
  poolMax: 10,
  poolIncrement: 0,
};

app.use(json());

OracleDB.createPool(cfPool).then(async(pool) => {
  const conn = await pool.getConnection()
  const ctx = createContext(conn);
  route(app, ctx);
  http.createServer(app).listen(port, () => {
    console.log('Start server at port ' + port);
  });
  console.log('Connected successfully to Oracle.');
})
.catch(e => {
  console.error('Failed to connect to Oracle.', e.message, e.stack);
});

// connectToDb().then(db => {
//   const ctx = createContext(db);
//   route(app, ctx);
//   http.createServer(app).listen(port, () => {
//     console.log('Start server at port ' + port);
//   });
// });