import { z } from 'zod';
import { createRpcClient, procedure, rpcServer } from './index.ts';

const a = procedure<MyServerContext>()
  .use(() => ({ abc: 123 }))
  .use((_serverContext, context) => ({ ...context, xyz: 456 }))
  .input(z.string())
  .define((input: string, context) => {
    console.log({ context, input }); // eslint-disable-line no-console
  });

interface MyServerContext {
  user: string,
}

const _exampleServer = rpcServer
  .setup((invokeRoute: (keyPath: string[], rawInput: unknown, serverContext: MyServerContext) => Promise<any>) => {
    setTimeout(() => {
      invokeRoute(['call', 'me', 'maybe'], 'asdf', { user: 'ye' });
    });
  })
  .routes({
    call: {
      me: {
        maybe: a,
        // yeah: procedure, // not allowed
      },
    },
  })
  .listen();

export type ExampleServer = typeof _exampleServer;

const client = createRpcClient<ExampleServer>(() => Promise.resolve(undefined));
client.call.me.maybe('asdf');
