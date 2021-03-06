import { User } from '../models/User';

export interface UserService {
  all(): Promise<User[]>;
  load(id: string): Promise<User|null>;
  insert(user: User): Promise<number>;
  insertBatch(users: User[]): Promise<number>;
  update(user: User): Promise<number>;
  delete(id: string): Promise<number>;
  transaction(users: User[]): Promise<number>;
}
