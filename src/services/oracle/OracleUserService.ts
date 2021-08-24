import OracleDB,{STRING,DB_TYPE_TIMESTAMP, DATE, Pool, Connection} from "oracledb";
import {User} from '../../models/User';
import { StringMap } from "./metadata";
import {exec, execBatch, query, queryOne } from './oracle';

export const dateMap:StringMap = {
  ID:'id',
  USERNAME:'username',
  EMAIL:'email',
  PHONE:'phone',
  DATEOFBIRTH:'dateOfBirth'
}
export class SqlUserService {
  private conn : Connection
  constructor(private pool: Pool) {
    pool.getConnection().then(c => {
      this.conn = c
    })
  }
  all(): Promise<User[]> {
    return query<User>(this.conn, 'SELECT * FROM users ORDER BY id ASC', undefined, dateMap);
  }
  load(id: string): Promise<User> {
    return queryOne(this.conn, 'SELECT * FROM users WHERE id = :0', [id], dateMap);
  }
  insert(user: User): Promise<number> {
    user.dateOfBirth = new Date(user.dateOfBirth);
    return exec(this.conn, `INSERT INTO users (id, username, email, phone, dateofbirth) VALUES (:0, :1, :2, :3, :4)`,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth]);
  }
  update(user: User): Promise<number> {
    if(user.dateOfBirth){
      user.dateOfBirth = new Date(user.dateOfBirth);
    }
    return exec(this.conn, `UPDATE users SET username=:1, email =:2, phone=:3, dateofbirth=:4 WHERE id = :0`,
    [ user.username, user.email, user.phone, user.dateOfBirth,user.id]);
  }
  delete(id: string): Promise<number> {
    return exec(this.conn, `DELETE FROM users WHERE id = :0`, [id]);
  }
  transaction(users:User[]): Promise<number>{
    users.forEach(item => {
      item.dateOfBirth = new Date(item.dateOfBirth);
    })
    return exec(this.conn,`INSERT INTO users (id, username, email, phone, dateofbirth) VALUES (:id, :username, :email, :phone, :dateofbirth)`,users)
  }
}