import type { Procedure } from './procedure.ts';
import type { RecursiveDictionary } from './util.ts';
import { isDefined } from '@petrhdk/util';
import { z } from 'zod';

interface RouterUndefined<ServerContext> {
  routes: <Routes extends RecursiveDictionary<Procedure<ServerContext, any, any, any>>>(routes: Routes) => Router<ServerContext, Routes>,
}

const clientToServerPayloadSchema = z.object({
  path: z.array(z.string()),
  input: z.unknown(),
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
            const { path, input } = clientToServerPayloadSchema.parse(clientToServerPayload);

            // find the procedure represented by `path`
            // (by traversing into the routes, starting at the top-level dictionary)
            let target: any = this.routes;
            while (path.length) {
              // security measure against code injection via prototype chain
              if (!Object.hasOwn(target, path[0])) {
                throw new Error('There is no procedure at the given path');
              }
              // traverse routes
              target = target[path.shift()!];
            }
            const procedure = target as Procedure<unknown, unknown, unknown, unknown>;

            // run procedure middleware
            let context;
            for (const middleware of procedure.middlewares) {
              context = await middleware(context, serverContext); // may throw exception
            }

            // run procedure inputValidator (using zod)
            const parsedInput = isDefined(procedure.inputValidator)
              ? procedure.inputValidator.parse(input) // may throw exception
              : input;

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
