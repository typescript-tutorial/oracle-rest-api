import {Application} from 'express';
import {ApplicationContext} from './context';

export function route(app: Application, ctx: ApplicationContext): void {
  const user = ctx.userController;
  const health = ctx.healthController;

  app.get('/health', health.check);

  app.get('/users', user.all);
  app.get('/users/:id', user.load);
  app.post('/users', user.insert);
  app.post('/userss', user.insertMany);
  app.put('/users/:id', user.update);
  app.delete('/users/:id', user.delete);
}
