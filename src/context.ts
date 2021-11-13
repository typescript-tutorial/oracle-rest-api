import { HealthController } from 'services/oracle/HealthController';
import { UserController } from './controllers/UserController';

export interface ApplicationContext {
  user: UserController;
  health: HealthController;
}
