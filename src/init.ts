import { Connection } from 'oracledb';
import { ApplicationContext } from './context';
import { UserController } from './controllers/UserController';
import { HealthController } from './services/oracle/HealthController';
import { OracleChecker } from './services/oracle/OracleChecker';
import { SqlUserService } from './services/oracle/OracleUserService';

export function createContext(db: Connection): ApplicationContext {
  const userService = new SqlUserService(db);
  const oracleChecker = new OracleChecker(db);
  const healthController = new HealthController([oracleChecker]);
  const userController = new UserController(userService);
  const ctx: ApplicationContext = { health: healthController, user: userController };
  return ctx;
}
