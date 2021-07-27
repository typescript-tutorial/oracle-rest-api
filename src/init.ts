import OracleDB from "oracledb";
import { HealthController } from "./services/oracle/HealthController";
import { OracleChecker } from "./services/oracle/OracleChecker";
import {ApplicationContext} from './context';
import {UserController} from './controllers/UserController';
import {OracleUserService} from './services/oracle/OracleUserService';

export function createContext(db: OracleDB.Connection): ApplicationContext {
    const userService = new OracleUserService(db);
    const oracleChecker = new OracleChecker(db)
    const healthController = new HealthController([oracleChecker]);
    const userController = new UserController(userService);
    const ctx: ApplicationContext = {healthController ,userController};
    return ctx;
}
