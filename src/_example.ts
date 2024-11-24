import { z } from 'zod';
import { createRpcClient, createRpcServer, procedure } from './index.ts';

const a = procedure
  .use(() => ({ abc: 123 }))
  .use((context) => ({ ...context, xyz: 456 }))
  .input(z.string())
  .define((input, context) => {
    console.log({ context, input }); // eslint-disable-line no-console
  });

const _exampleServer = createRpcServer({
  call: {
    me: {
      maybe: a,
      yeah: procedure, // TODO: this should not be allowed, mysterious
    },
  },
});

type ExampleServer = typeof _exampleServer;

const client = createRpcClient<ExampleServer>(() => Promise.resolve(undefined));
client.call.me.maybe('asdf');
