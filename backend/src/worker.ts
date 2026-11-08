import { httpServerHandler } from 'cloudflare:node';
import app from './index';
import { expirePendingCheckouts } from './lib/inventory';

const port = 5000;
app.listen(port);
const httpHandler = httpServerHandler({ port });

export default {
  fetch: httpHandler.fetch,
  scheduled(_controller: ScheduledController, _env: Env, context: ExecutionContext) {
    context.waitUntil(expirePendingCheckouts());
  },
};
