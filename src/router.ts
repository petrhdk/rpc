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
          let output: unknown | undefined;
          let error: string | undefined;

          // try to invoke the route
          //   - if no exception is thrown, this function will only return `{ output }`
          //   - if an exception is thrown, this function will only return `{ error }`
          try {
            // validate payload
            const { keyPath, rawInput } = clientToServerPayloadSchema.parse(clientToServerPayload);

            // find the procedure represented by `keyPath`
            // (by traversing into the routes, starting at the top-level dictionary)
            let target: any = this.routes;
            while (keyPath.length) {
              // security measure against code injection via prototype chain
              if (!Object.hasOwn(target, keyPath[0])) {
                throw new Error('There is no procedure at the given keyPath');
              }
              // traverse routes
              target = target[keyPath.shift()!];
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

          // response (ServerToClientPayload)
          return (error !== undefined)
            ? { error }
            : { output };
        },
      };
    },
  };
}
