import OracleDB,{STRING,DB_TYPE_TIMESTAMP, DATE} from "oracledb";
import {User} from '../../models/User';
import {exec, execute, executeTran, query, queryOne, Statement, StringMap} from './oracle';

export const dateMap:StringMap = {
  ID:'id',
  USERNAME:'username',
  EMAIL:'email',
  PHONE:'phone',
  DATEOFBIRTH:'dateOfBirth'
}
export class SqlUserService {
  constructor(private client: OracleDB.Connection) {
  }
  all(): Promise<User[]> {
    return query<User>(this.client, 'SELECT * FROM users ORDER BY id ASC', undefined, dateMap);
  }
  load(id: string): Promise<User> {
    return queryOne(this.client, 'SELECT * FROM users WHERE id = :0', [id], dateMap);
  }
  insert(user: User): Promise<number> {
    user.dateOfBirth = new Date(user.dateOfBirth);
    return exec(this.client, `INSERT INTO users (id, username, email, phone, dateofbirth) VALUES (:0, :1, :2, :3, :4)`,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth]);
  }
  insertMany(users:User[]): Promise<number>{
    users.forEach(item => {
      item.dateOfBirth = new Date(item.dateOfBirth);
    })
    return execute(this.client,`INSERT INTO users (id, username, email, phone, dateofbirth) VALUES (:id, :username, :email, :phone, :dateofbirth)`,users)
  }
  insertArray(users:User[]): Promise<number>{
    let statement = users.map(item => {
      return {
        query:`INSERT INTO users (id, username, email, phone, dateofbirth) VALUES (:0, :1, :2, :3, :4)`,
        args:[item.id, item.username, item.email, item.phone, new Date(item.dateOfBirth)]
      }
    })
    return executeTran(this.client,statement)
  }
  update(user: User): Promise<number> {
    if(user.dateOfBirth){
      user.dateOfBirth = new Date(user.dateOfBirth);
    }
    return exec(this.client, `UPDATE users SET username=:1, email =:2, phone=:3, dateofbirth=:4 WHERE id = :0`,
    [ user.username, user.email, user.phone, user.dateOfBirth,user.id]);
  }
  delete(id: string): Promise<number> {
    return exec(this.client, `DELETE FROM users WHERE id = :0`, [id]);
  }
}