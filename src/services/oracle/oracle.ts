import OracleDB, { getConnection, autoCommit, Pool, Connection} from "oracledb";
import { buildToSave, buildToSaveBatch } from "./build";
import { Attribute, Attributes, Manager, Statement, StringMap } from "./metadata";
export class OracleManager implements Manager {
  private conn:Connection;
  constructor(public pool: Pool) {
    pool.getConnection().then(c => {this.conn = c})
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  exec(sql: string, args?: any[]): Promise<number> {
    return exec(this.conn, sql, args);
  }
  execBatch(statements: Statement[], firstSuccess?: boolean): Promise<number> {
    return execBatch(this.conn, statements, firstSuccess);
  }
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]> {
    return query(this.conn, sql, args, m, bools);
  }
  queryOne<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T> {
    return queryOne(this.conn, sql, args, m, bools);
  }
  executeScalar<T>(sql: string, args?: any[]): Promise<T> {
    return executeScalar<T>(this.conn, sql, args);
  }
  count(sql: string, args?: any[]): Promise<number> {
    return count(this.conn, sql, args);
  }
}

export async function execBatch(conn: Connection, statements: Statement[], firstSuccess?: boolean): Promise<number> {
  let c = 0;
  if (!statements || statements.length === 0) {
    return Promise.resolve(0);
  } else if (statements.length === 1) {
    return exec(conn, statements[0].query, statements[0].params);
  }
  if(firstSuccess){
    try {
      const result0  = await conn.execute(statements[0].query, statements[0].params)
      if(result0 && result0.rowsAffected !== 0){
        let listStatements = statements.slice(1);
        const arrPromise = listStatements.map((item) => {
          return conn.execute(item.query, item.params ? item.params : [],{autoCommit:false});
        });
        await Promise.all(arrPromise).then(results => {
          for (const obj of results) {
            c += obj.rowsAffected;
          }
        });
        c += result0.rowsAffected;
        await conn.commit();
        return c;;
      }
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  else {
    try {
      const arrPromise = statements.map((item) => conn.execute(item.query, item.params ? item.params : [], {autoCommit:false}));
      let c = 0;
      await Promise.all(arrPromise).then(results => {
        for (const obj of results) {
          c += obj.rowsAffected;
        }
      });
      await conn.commit();
      return c;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}

export function exec(conn: Connection, sql: string, args?: any[]): Promise<number> {
  const p = toArray(args);
  return new Promise<number>((resolve, reject) => {
    return conn.execute(sql, p, { autoCommit: true }, (err, results) => {
      if (err) {
        return reject(err);
      } else {
        return resolve(results.rowsAffected);
      }
    });
  });
}

export function query<T>(conn: Connection, sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]> {
  const p = toArray(args);
  return new Promise<T[]>((resolve, reject) => {
    return conn.execute<T>(sql, p, { autoCommit: true }, (err, results) => {
      if (err) {
        return reject(err);
      } else {
        const arrayResult = results.rows.map(item => {
          return mapData<T>(results.metaData,item)
        });
        return resolve(handleResults(arrayResult, m, bools));
      }
    });
  });
}

export function queryOne<T>(conn: Connection, sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T> {
  return query<T>(conn, sql, args, m, bools).then(r => {
    return (r && r.length > 0 ? r[0] : null);
  });
}

export function executeScalar<T>(conn: Connection, sql: string, args?: any[]): Promise<T> {
  return queryOne<T>(conn, sql, args).then(r => {
    if (!r) {
      return null;
    } else {
      const keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}

export function count(conn: Connection, sql: string, args?: any[]): Promise<number> {
  return executeScalar<number>(conn, sql, args);
}

export function save<T>(conn: Connection|((sql: string, args?: any[]) => Promise<number>), obj: T, table: string, attrs: Attributes, ver?: string, buildParam?: (i: number) => string, i?: number): Promise<number> {
  const s = buildToSave(obj, table, attrs, ver, buildParam);
  if (typeof conn === 'function') {
    return conn(s.query, s.params);
  } else {
    return exec(conn, s.query, s.params);
  }
}

export function saveBatch<T>(conn: Connection|((statements: Statement[]) => Promise<number>), objs: T[], table: string, attrs: Attributes, ver?: string, buildParam?: (i: number) => string): Promise<number> {
  const s = buildToSaveBatch(objs, table, attrs, ver, buildParam);
  if (typeof conn === 'function') {
    return conn(s);
  } else {
    return execBatch(conn, s);
  }
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

export function handleResults<T>(r: T[], m?: StringMap, bools?: Attribute[]) {
  if (m) {
    const res = mapArray(r, m);
    if (bools && bools.length > 0) {
      return handleBool(res, bools);
    } else {
      return res;
    }
  } else {
    if (bools && bools.length > 0) {
      return handleBool(r, bools);
    } else {
      return r;
    }
  }
}

export function handleBool<T>(objs: T[], bools: Attribute[]) {
  if (!bools || bools.length === 0 || !objs) {
    return objs;
  }
  for (const obj of objs) {
    for (const field of bools) {
      const value = obj[field.name];
      if (value != null && value !== undefined) {
        const b = field.true;
        if (b == null || b === undefined) {
          // tslint:disable-next-line:triple-equals
          obj[field.name] = ('true' == value || '1' == value || 'T' == value || 'Y' == value);
        } else {
          // tslint:disable-next-line:triple-equals
          obj[field.name] = (value == b ? true : false);
        }
      }
    }
  }
  return objs;
}

export function map<T>(obj: T, m?: StringMap): any {
  if (!m) {
    return obj;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  const obj2: any = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
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

export function getFields(fields: string[], all?: string[]): string[] {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const ext: string [] = [];
  if (all) {
    for (const s of fields) {
      if (all.includes(s)) {
        ext.push(s);
      }
    }
    if (ext.length === 0) {
      return undefined;
    } else {
      return ext;
    }
  } else {
    return fields;
  }
}

export function buildFields(fields: string[], all?: string[]): string {
  const s = getFields(fields, all);
  if (!s || s.length === 0) {
    return '*';
  } else {
    return s.join(',');
  }
}

export function getMapField(name: string, mp?: StringMap): string {
  if (!mp) {
    return name;
  }
  const x = mp[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  return name;
}

export function isEmpty(s: string): boolean {
  return !(s && s.length > 0);
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

// export class StringService {
//   constructor(protected pool: Pool, public table: string, public column: string) {
//     this.load = this.load.bind(this);
//     this.save = this.save.bind(this);
//   }
//   load(key: string, max: number): Promise<string[]> {
//     const s = `select ${this.column} from ${this.table} where ${this.column} like ? order by ${this.column} limit ${max}`;
//     console.log(s);
//     return query(this.pool, s, ['' + key + '%']).then(arr => {
//       return arr.map(i => i[this.column] as string);
//     });
//   }
//   save(values: string[]): Promise<number> {
//     if (!values || values.length === 0) {
//       return Promise.resolve(0);
//     }
//     const arr: string[] = [];
//     for (let i = 1; i <= values.length; i++) {
//       arr.push('(?)');
//     }
//     const s = `insert ignore into ${this.table}(${this.column})values${arr.join(',')}`;
//     return exec(this.pool, s, values);
//   }
// }

// export function version(attrs: Attributes): Attribute {
//   const ks = Object.keys(attrs);
//   for (const k of ks) {
//     const attr = attrs[k];
//     if (attr.version) {
//       attr.name = k;
//       return attr;
//     }
//   }
//   return undefined;
// }
// // tslint:disable-next-line:max-classes-per-file
// export class MySQLWriter<T> {
//   pool?: Pool;
//   version?: string;
//   exec?: (sql: string, args?: any[]) => Promise<number>;
//   map?: (v: T) => T;
//   param?: (i: number) => string;
//   constructor(pool: Pool|((sql: string, args?: any[]) => Promise<number>), public table: string, public attributes: Attributes, toDB?: (v: T) => T, buildParam?: (i: number) => string) {
//     this.write = this.write.bind(this);
//     if (typeof pool === 'function') {
//       this.exec = pool;
//     } else {
//       this.pool = pool;
//     }
//     this.param = buildParam;
//     this.map = toDB;
//     const x = version(attributes);
//     if (x) {
//       this.version = x.name;
//     }
//   }
//   write(obj: T): Promise<number> {
//     if (!obj) {
//       return Promise.resolve(0);
//     }
//     let obj2 = obj;
//     if (this.map) {
//       obj2 = this.map(obj);
//     }
//     const stmt = buildToSave(obj2, this.table, this.attributes, this.version, this.param);
//     if (stmt) {
//       if (this.exec) {
//         return this.exec(stmt.query, stmt.params);
//       } else {
//         return exec(this.pool, stmt.query, stmt.params);
//       }
//     } else {
//       return Promise.resolve(0);
//     }
//   }
// }
// // tslint:disable-next-line:max-classes-per-file
// export class MySQLBatchWriter<T> {
//   pool?: Pool;
//   version?: string;
//   execute?: (statements: Statement[]) => Promise<number>;
//   map?: (v: T) => T;
//   param?: (i: number) => string;
//   constructor(pool: Pool|((statements: Statement[]) => Promise<number>), public table: string, public attributes: Attributes, toDB?: (v: T) => T, buildParam?: (i: number) => string) {
//     this.write = this.write.bind(this);
//     if (typeof pool === 'function') {
//       this.execute = pool;
//     } else {
//       this.pool = pool;
//     }
//     this.param = buildParam;
//     this.map = toDB;
//     const x = version(attributes);
//     if (x) {
//       this.version = x.name;
//     }
//   }
//   write(objs: T[]): Promise<number> {
//     if (!objs || objs.length === 0) {
//       return Promise.resolve(0);
//     }
//     let list = objs;
//     if (this.map) {
//       list = [];
//       for (const obj of objs) {
//         const obj2 = this.map(obj);
//         list.push(obj2);
//       }
//     }
//     const stmts = buildToSaveBatch(list, this.table, this.attributes, this.version, this.param);
//     if (stmts && stmts.length > 0) {
//       if (this.execute) {
//         return this.execute(stmts);
//       } else {
//         return execBatch(this.pool, stmts);
//       }
//     } else {
//       return Promise.resolve(0);
//     }
//   }
// }

// export interface AnyMap {
//   [key: string]: any;
// }
// // tslint:disable-next-line:max-classes-per-file
// export class MySQLChecker {
//   constructor(private pool: Pool, private service?: string, private timeout?: number) {
//     if (!this.timeout) {
//       this.timeout = 4200;
//     }
//     if (!this.service) {
//       this.service = 'mysql';
//     }
//     this.check = this.check.bind(this);
//     this.name = this.name.bind(this);
//     this.build = this.build.bind(this);
//   }
//   async check(): Promise<AnyMap> {
//     const obj = {} as AnyMap;
//     const promise = new Promise<any>((resolve, reject) => {
//       this.pool.query('select current_time', (err, result) => {
//         if (err) {
//           return reject(err);
//         } else {
//           resolve(obj);
//         }
//       });
//     });
//     if (this.timeout > 0) {
//       return promiseTimeOut(this.timeout, promise);
//     } else {
//       return promise;
//     }
//   }
//   name(): string {
//     return this.service;
//   }
//   build(data: AnyMap, err: any): AnyMap {
//     if (err) {
//       if (!data) {
//         data = {} as AnyMap;
//       }
//       data['error'] = err;
//     }
//     return data;
//   }
// }

// function promiseTimeOut(timeoutInMilliseconds: number, promise: Promise<any>): Promise<any> {
//   return Promise.race([
//     promise,
//     new Promise((resolve, reject) => {
//       setTimeout(() => {
//         reject(`Timed out in: ${timeoutInMilliseconds} milliseconds!`);
//       }, timeoutInMilliseconds);
//     })
//   ]);
// }