import OracleDB, { getConnection, autoCommit} from "oracledb";
export interface StringMap {
  [key: string]: string;
}
export interface Statement {
  query: string;
  args?: any[];
}
export interface Manager {
  exec(sql: string, args?: any[]): Promise<number>;
  execute(statements: [],query:string): Promise<number>;
  query<T>(sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T[]>;
  queryOne<T>(sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T>;
  executeScalar<T>(sql: string, args?: any[]): Promise<T>;
  count(sql: string, args?: any[]): Promise<number>;
}
export class OracleManager implements Manager {
  constructor(public client: OracleDB.Connection) {
    this.exec = this.exec.bind(this);
    this.execute = this.execute.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  exec(sql: string, args?: any[]): Promise<number> {
    return exec(this.client, sql, args);
  }
  execute(statements: any[],query:string): Promise<number> {
    return execute(this.client,query, statements);
  }
  query<T>(sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T[]> {
    return query(this.client, sql, args, m, fields);
  }
  queryOne<T>(sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T> {
    return queryOne(this.client, sql, args, m, fields);
  }
  executeScalar<T>(sql: string, args?: any[]): Promise<T> {
    return executeScalarWithclient<T>(this.client, sql, args);
  }
  count(sql: string, args?: any[]): Promise<number> {
    return countWithclient(this.client, sql, args);
  }
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

export function exec(client: OracleDB.Connection, sql: string, args?: any[]): Promise<number> {
  const p = toArray(args);
  return new Promise<number>((resolve, reject) => {
    return client.execute(sql, p, { autoCommit: true }, (err, results) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(results.rowsAffected);
      }
    });
  });
}

export async function execute(client: OracleDB.Connection,query:string, statements: any[]): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    return client.executeMany(query, statements, {autoCommit: true} , (err, results) => {
      if (err) {
        client.rollback();
        return reject(err);
      } else {
        return resolve(results.rowsAffected);
      }
    });
  });
}

export async function executeTran(client: OracleDB.Connection,statements:Statement[]) {
  try {
    const arrPromise = statements.map((item) => client.execute(item.query, item.args ? item.args : [], {autoCommit:false}));
    let c = 0;
    await Promise.all(arrPromise).then(results => {
      for (const obj of results) {
        c += obj.rowsAffected;
      }
    });
    await client.commit();
    return c;
  } catch (e) {
    await client.rollback();
    throw e;
  } 
}

export function query<T>(client: OracleDB.Connection, sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T[]> {
  const p = toArray(args);
  return new Promise<T[]>((resolve, reject) => {
    return client.execute<T>(sql, p, { autoCommit: true }, (err, results) => {
      if (err) {
        return reject(err);
      } else {
        const arrayResult = results.rows.map(item => {
          return mapData<T>(results.metaData,item)
        });
        return resolve(handleResults(arrayResult, m, fields));
      }
    });
  });
}

export function queryWithclient<T>(client: OracleDB.Connection, sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T[]> {
  const p = toArray(args);
  return new Promise<T[]>((resolve, reject) => {
    return client.execute<T>(sql, p, { autoCommit: true }, (err, results) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(handleResults(results.rows, m, fields));
      }
    });
  });
}

export function queryOne<T>(client: OracleDB.Connection, sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T> {
  return query<T>(client, sql, args, m, fields).then(r => {
    return (r && r.length > 0 ? r[0] : null);
  });
}

export function queryOneWithClient<T>(client: OracleDB.Connection, sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T> {
  return queryWithclient<T>(client, sql, args, m, fields).then(r => {
    return (r && r.length > 0 ? r[0] : null);
  });
}

export function executeScalarWithclient<T>(client: OracleDB.Connection, sql: string, args?: any[]): Promise<T> {
  return queryOneWithClient<T>(client, sql, args).then(r => {
    if (!r) {
      return null;
    } else {
      const keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}

export function countWithclient(client: OracleDB.Connection, sql: string, args?: any[]): Promise<number> {
  return executeScalarWithclient<number>(client, sql, args);
}

export function handleResults<T>(r: T[], m?: StringMap, fields?: string[]) {
  if (m) {
    const res = mapArray(r, m);
    if (fields && fields.length > 0) {
      return handleBool(res, fields);
    } else {
      return res;
    }
  } else {
    if (fields && fields.length > 0) {
      return handleBool(r, fields);
    } else {
      return r;
    }
  }
}

export function handleBool<T>(objs: T[], fields: string[]) {
  if (!fields || fields.length === 0 || !objs) {
    return objs;
  }
  for (const obj of objs) {
    for (const field of fields) {
      const value = obj[field];
      if (value != null && value !== undefined) {
        // tslint:disable-next-line:triple-equals
        obj[field] = ('1' == value || 'T' === value || 'Y' === value);
      }
    }
  }
  return objs;
}

export function toArray<T>(arr: T[]): T[] {
  if (!arr || arr.length === 0) {
    return [];
  }
  const p: T[] = [];
  const l = arr.length;
  for (let i = 0; i < l; i++) {
    if (arr[i] === undefined) {
      p.push(null);
    } else {
      p.push(arr[i]);
    }
  }
  return p;
}

export function mapArray<T>(results: T[], m?: StringMap): T[] {
  if (!m) {
    return results;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return results;
  }
  const objs = [];
  const length = results.length;
  for (let i = 0; i < length; i++) {
    const obj = results[i];
    const obj2: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      let k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = (obj as any)[key];
    }
    objs.push(obj2);
  }
  return objs;
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