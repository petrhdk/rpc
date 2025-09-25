import { z } from 'zod';
import { createRpcClient, procedure, router, type ServerToClientPayload } from './index.ts';

interface MyServerContext {
  user: string,
}

const p = procedure<MyServerContext>()
  .use(({ user }) => ({ user, abc: 123 }))
  .use((_, previousContext) => ({ ...previousContext, xyz: 456 }))
  .input(z.string())
  .define((input: string, context) => {
    console.log({ context, input }); // eslint-disable-line no-console
    return 123;
  });

const server = router<MyServerContext>().routes({
  call: {
    me: {
      maybe: p,
      // yeah: procedure(), // not allowed
    },
  },
});
export type ExampleServer = typeof server;

// set up your HTTP server (or similar).
// ...
server.invokeRoute(
  {
    keyPath: ['call', 'me', 'maybe'],
    rawInput: 'asdf',
  },
  { user: 'ye' },
);

const client = createRpcClient<ExampleServer>(async (_clientToServerPayload) => {
  // send to server
  const response: ServerToClientPayload = await /* ... */ { output: 123, error: undefined };
  return response;
});
client.call.me.maybe('asdf');
