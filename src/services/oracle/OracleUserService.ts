import OracleDB from 'oracledb';
import {User} from '../../models/User';
import { deleteOne, getAll, getById, insertOne, updateOne } from './oracle';

export class OracleUserService {
  private readonly id = 'id';
  private readonly tableName = 'users';
  private readonly client:OracleDB.Connection;
  constructor(db: OracleDB.Connection) {
    this.client = db;
  }
  all(): Promise<User[]>{
    return getAll(this.client,this.tableName);
  } 
  load(id: string): Promise<User>{
    return getById(this.client,this.tableName,this.id,id);
  }
  insert(user: User): Promise<number>{
    user.dateOfBirth = new Date(user.dateOfBirth);
    return insertOne<User>(this.client,this.tableName,user);
  }
  update(user: User): Promise<number>{
    user.dateOfBirth = new Date(user.dateOfBirth);
    return updateOne<User>(this.client,this.tableName,user,this.id);
  }
  patch(user: User): Promise<number>{
    if(user.dateOfBirth){
      user.dateOfBirth = new Date(user.dateOfBirth);
    }
    return updateOne<User>(this.client,this.tableName,user,this.id);
  }
  delete(id: string): Promise<number>{
    return deleteOne(this.client,this.tableName,this.id,id);
  }
}
