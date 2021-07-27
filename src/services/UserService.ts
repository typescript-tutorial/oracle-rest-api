import {User} from '../models/User';

export interface UserService {
  all(): Promise<User[]>;
  load(id: string): Promise<User>;
  insert(user: User): Promise<number>;
  update(user: User): Promise<number>;
  patch(user: User): Promise<number>;
  delete(id: string): Promise<number>;
}
