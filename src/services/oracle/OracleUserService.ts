import {Connection} from 'oracledb';
import {User} from '../../models/User';
import {StringMap} from './metadata';
import {exec, execBatch, query, queryOne } from './oracle';

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
  load(id: string): Promise<User> {
    return queryOne(this.conn, 'SELECT * FROM users WHERE id = :0', [id], dateMap);
  }
  insert(user: User): Promise<number> {
    user.dateOfBirth = new Date(user.dateOfBirth);
    const str = `
        MERGE INTO users USING dual ON ( id = :0 )
        WHEN MATCHED THEN UPDATE SET username = :1, email = :2, phone = :3, dateofbirth = :4
        WHEN NOT MATCHED THEN INSERT
            VALUES (:0, :1, :2, :3, :4)
    `;
    // const str = `INSERT INTO users (id, username, email, phone, dateofbirth) VALUES (:0, :1, :2, :3, :4) ON DUPLICATE KEY UPDATE username = VALUES(:1), email = VALUES(:2), phone = VALUES(:3), dateofbirth = VALUES(:4) WHERE id = :0;`
    return exec(this.conn, str,
     [user.id, user.username, user.email, user.phone, user.dateOfBirth]);
  }
  update(user: User): Promise<number> {
    if (user.dateOfBirth) {
      user.dateOfBirth = new Date(user.dateOfBirth);
    }
    return exec(this.conn, `UPDATE users SET username=:1, email =:2, phone=:3, dateofbirth=:4 WHERE id = :0`,
    [ user.username, user.email, user.phone, user.dateOfBirth, user.id]);
  }
  delete(id: string): Promise<number> {
    return exec(this.conn, `DELETE FROM users WHERE id = :0`, [id]);
  }
  transaction(users: User[]): Promise<number> {
    users.forEach(item => {
      item.dateOfBirth = new Date(item.dateOfBirth);
    });
    const statements = users.map((item) => {
      return { query: `INSERT INTO users (id, username, email, phone, dateofbirth) VALUES (:0, :1, :2, :3, :4)`, params: [item.id, item.username, item.email, item.phone, item.dateOfBirth] };
    });
    return execBatch(this.conn, statements, true);
  }
}
