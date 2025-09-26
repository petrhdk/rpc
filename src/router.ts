import type { Procedure } from './procedure.ts';
import type { RecursiveDictionary } from './util.ts';
import { isDefined } from '@petrhdk/util';

interface RouterUndefined<ServerContext> {
  routes: <Routes extends RecursiveDictionary<Procedure<ServerContext, any, any, any>>>(routes: Routes) => Router<ServerContext, Routes>,
}

export interface ClientToServerPayload {
  keyPath: string[],
  rawInput: unknown,
}

export interface ServerToClientPayload {
  output: unknown,
  error: unknown,
}

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

        async invokeRoute({ keyPath, rawInput }, serverContext) {
          let output, error;
          try {
            // find procedure
            let target: any = this.routes;
            while (keyPath.length) {
              target = target[keyPath.shift()!]; // may throw exception
            }
            const procedure = target as Procedure<unknown, unknown, unknown, unknown>;

            // run procedure middleware
            let context;
            for (const middleware of procedure.middlewares) {
              context = await middleware(context, serverContext); // may throw exception
            }

            // run procedure inputValidator (using `zod`)
            const parsedInput = isDefined(procedure.inputValidator)
              ? procedure.inputValidator.parse(rawInput) // may throw exception
              : rawInput;

            // invoke procedure handler
            output = await procedure.handler(parsedInput, context, serverContext); // may throw exception
          }
          catch (e) {
            error = e;
          }
          return { output, error };
        },
      };
    },
  };
}
