import OracleDB, { getConnection} from "oracledb";
import { deleteQuery, getQuery, InserQuery, updateQuery } from "./Query";

export interface StringMap {
  [key: string]: string;
}

export const UserMap:StringMap = {
  ID:'id',
  USERNAME:'username',
  EMAIL:'email',
  PHONE:'phone',
  DATEOFBIRTH:'dateOfBirth'
}

export async function connectToDb(): Promise<OracleDB.Connection> {
  try {
    const connection = await getConnection({
      user          : 'users',
      password      : 'users',    
      connectString: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(Host=localhost)(Port=1521))(CONNECT_DATA=(SID=ORCL)))'     
    });
    console.log('connect oracle success!');
    return connection;
  } catch (err) {
    console.log(err);
  }
}

export function getAll<T>(client:OracleDB.Connection ,tableName:string):Promise<T>{
  const query = getQuery(tableName);
  return client.execute(query).then(result => {
    return result.rows.map(item => {
      return mapData<T>(result.metaData,item,UserMap)
    });
  }).catch(err => {
    console.log(err);
    return err
  })
}

export function getById<T>(client:OracleDB.Connection ,tableName:string,keyWhere:string,valueWhere:any):Promise<T>{
  const query = getQuery(tableName,keyWhere);
  return client.execute(query,[valueWhere]).then(result => {
    return mapData<T>(result.metaData,result.rows[0],UserMap)
  }).catch(err => {
    console.log(err);
    return err
  })
}

export function insertOne<T>(client:OracleDB.Connection ,tableName:string,obj:T):Promise<number> {
  const queries = InserQuery(tableName,obj);
  return client.execute(queries.query,queries.params,{ autoCommit: true }).then(result => {
    return result.rowsAffected;
  }).catch(err => {
    console.log(err);
    return err
  })
}

export function updateOne<T>(client:OracleDB.Connection ,tableName:string,obj:T,keyWhere:string):Promise<number> {
  const queries = updateQuery(tableName,obj,keyWhere);
  return client.execute(queries.query,queries.params,{ autoCommit: true }).then(result => {
    return result.rowsAffected;
  }).catch(err => {
    console.log(err);
    return err
  })
}

export function deleteOne(client:OracleDB.Connection ,tableName:string,keyWhere:string,valuesWhere:string):Promise<number> {
  const query = deleteQuery(tableName,keyWhere);
  return client.execute(query,[valuesWhere],{ autoCommit: true }).then(result => {
    return result.rowsAffected;
  }).catch(err => {
    console.log(err);
    return err
  })
}

export function mapData<T>(nameColumn:any,data:any, m?: StringMap): T {
  let result:any = {};
  nameColumn.forEach((item,index) => {
    let key = item.name;
    if (m) {
      key = m[item.name];
    }
    result[key] = data[index];
  })
  return result
}
