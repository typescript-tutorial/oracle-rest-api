import { Connection } from 'oracledb';
import { User } from '../../models/User';
import { buildToInsertBatch, buildToSave, buildToSaveBatch } from './build';
import { StringMap } from './metadata';
import { Model } from './metadata';
import { exec, execBatch, query, queryOne } from './oracle';

export const dateMap: StringMap = {
  ID: 'id',
  USERNAME: 'username',
  EMAIL: 'email',
  PHONE: 'phone',
  DATEOFBIRTH: 'dateOfBirth'
};
export class SqlUserService {
  constructor(private conn: Connection) {
  }
  all(): Promise<User[]> {
    return query<User>(this.conn, 'SELECT * FROM users ORDER BY id ASC', undefined, dateMap);
  }
  load(id: string): Promise<User|null> {
    return queryOne(this.conn, 'SELECT * FROM users WHERE id = :0', [id], dateMap);
  }
  insert(user: User): Promise<number> {
    if (user.dateOfBirth) {
      user.dateOfBirth = new Date(user.dateOfBirth);
    }
    const stm = buildToSave<User>(user, 'users', userModel.attributes);
    if (!stm) {
      return Promise.resolve(-1);
    }
    return exec(this.conn, stm.query, stm.params);
  }
  insertBatch(users: User[]): Promise<number> {
    users.forEach(item => {
      if (item.dateOfBirth) {
        item.dateOfBirth = new Date(item.dateOfBirth);
      }
    });
    const stm = buildToInsertBatch<User>(users, 'users', userModel.attributes);
    if (!stm) {
      return Promise.resolve(-1);
    }
    return exec(this.conn, stm.query, stm.params);
  }
  update(user: User): Promise<number> {
    if (user.dateOfBirth) {
      user.dateOfBirth = new Date(user.dateOfBirth);
    }
    return exec(this.conn, `UPDATE users SET username=:1, email =:2, phone=:3, dateofbirth=:4 WHERE id = :0`,
      [user.username, user.email, user.phone, user.dateOfBirth, user.id]);
  }
  delete(id: string): Promise<number> {
    return exec(this.conn, `DELETE FROM users WHERE id = :0`, [id]);
  }
  transaction(users: User[]): Promise<number> {
    users.forEach(item => {
      if (item.dateOfBirth) {
        item.dateOfBirth = new Date(item.dateOfBirth);
      }
    });
    const statements = buildToSaveBatch<User>(users, 'users', userModel.attributes);
    return execBatch(this.conn, statements, false);
  }
}

export const userModel: Model = {
  name: 'user',
  attributes: {
    id: {
      key: true,
      match: 'equal'
    },
    username: {
      match: 'contain'
    },
    email: {
      format: 'email',
      required: true
    },
    phone: {
      format: 'phone',
      required: true
    },
    dateOfBirth: {
      type: 'datetime',
      field: 'dateofbirth'
    },
    // interests:{
    //   match: 'contain'
    // },
    // skills:{
    //   match: 'contain'
    // },
    // achievements:{
    //   match: 'contain'
    // },
    // settings:{
    //   match: 'contain'
    // }
  }
};
