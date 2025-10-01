import type { Procedure } from './procedure.ts';
import type { RecursiveDictionary } from './util.ts';
import { isDefined } from '@petrhdk/util';
import { z } from 'zod';

interface RouterUndefined<ServerContext> {
  routes: <Routes extends RecursiveDictionary<Procedure<ServerContext, any, any, any>>>(routes: Routes) => Router<ServerContext, Routes>,
}

const clientToServerPayloadSchema = z.object({
  keyPath: z.array(z.string()),
  rawInput: z.unknown(),
});
export type ClientToServerPayload = z.infer<typeof clientToServerPayloadSchema>;

export type ServerToClientPayload = {
  output: unknown,
} | {
  error: string,
};

export interface Router<ServerContext, Routes> {
  /** @internal */
  routes: Routes,

  invokeRoute: (_: ClientToServerPayload, serverContext: ServerContext) => Promise<ServerToClientPayload>,
}

export function router<ServerContext = undefined>(): RouterUndefined<ServerContext> {
  return { // RouterUndefined
    routes(routes) {
      return { // Router
        routes,

        async invokeRoute(clientToServerPayload, serverContext) {
          let output, error;
          try {
            // validate payload
            const { keyPath, rawInput } = clientToServerPayloadSchema.parse(clientToServerPayload);

            // find procedure
            let target: any = this.routes;
            while (keyPath.length) {
              // security measure against code injection via prototype chain
              if (!Object.getOwnPropertyNames(target).includes(keyPath[0])) {
                throw new Error('There is no procedure at the given path');
              }

              // traverse routes
              target = target[keyPath.shift()!]; // may throw exception
            }
            const procedure = target as Procedure<unknown, unknown, unknown, unknown>;

            // run procedure middleware
            let context;
            for (const middleware of procedure.middlewares) {
              context = await middleware(context, serverContext); // may throw exception
            }

            // run procedure inputValidator (using zod)
            const parsedInput = isDefined(procedure.inputValidator)
              ? procedure.inputValidator.parse(rawInput) // may throw exception
              : rawInput;

            // invoke procedure handler
            output = await procedure.handler(parsedInput, context, serverContext); // may throw exception
          }
          catch (e) {
            error = String(e);
          }

          // send procedure results
          return { output, error };
        },
      };
    },
  };
}
