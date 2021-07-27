import {Application} from 'express';
import {ApplicationContext} from './context';

export function route(app: Application, ctx: ApplicationContext): void {
  const user = ctx.userController;
  const health = ctx.healthController;

  app.get('/health', health.check);

  app.get('/users', user.all);
  app.get('/user', user.load);
  app.post('/users', user.insert);
  app.put('/users', user.update);
  app.patch('/users', user.patch);
  app.delete('/users', user.delete);
}
