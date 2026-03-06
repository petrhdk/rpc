import type { ServerToClientPayload } from './index.ts';
import { z } from 'zod';
import * as rpc from './index.ts';

interface MyServerContext {
  user: string,
}

const p = rpc.procedure.initialContext<MyServerContext>()
  .use(({ user }) => ({ user, abc: 123 }))
  .use((previousContext) => ({ ...previousContext, xyz: 456 }))
  .input(z.string())
  .define((input: string, context) => {
    console.log({ context, input }); // eslint-disable-line no-console
    return 123;
  });

const server = rpc.server.initialContext<MyServerContext>().routes({
  call: {
    me: {
      maybe: p,
    },
  },
});
export type MyServer = typeof server;

// set up your HTTP server (or similar).
// ...
server.invokeRoute(
  {
    path: ['call', 'me', 'maybe'],
    input: 'asdf',
  },
  { user: 'ye' },
);

const client = rpc.createClient<MyServer>(async (_clientToServerPayload) => {
  // send to server
  const response: ServerToClientPayload = await /* ... */ { output: 123, error: undefined };
  return response;
});
client.call.me.maybe('asdf');
