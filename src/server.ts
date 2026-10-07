/**
 * Hint:
 *  - See README.md to understand the conceptual design of the server builder.
 */

import type { Procedure } from './procedure.ts';
import type { RecursiveDictionary } from './util.ts';
import { isDefined } from '@petrhdk/util';
import { z } from 'zod';

// [types]: util types
// ---------------------------------------------------------
export interface RequestPayload {
  path: string[],
  input: unknown,
}

export type ResponsePayload = { output: unknown } | { error: string };

// [types]: server stages
// ---------------------------------------------------------
interface ServerEmpty<InitialContext> {
  mustProvideInitialContext: <NewInitialContext>() => ServerEmpty<NewInitialContext>,
  routes: <Routes extends RecursiveDictionary<Procedure<InitialContext, any, any, any>>>(routes: Routes) => Server<InitialContext, Routes>,
}

export interface Server<InitialContext, Routes> {
  /** @internal */
  routes: Routes,

  invokeRoute: ({ path, input, initialContext }: { path: string[], input: unknown, initialContext: InitialContext }) => Promise<ResponsePayload>,
}

// [implementation]: empty server (starting point)
// ---------------------------------------------------------
export const server: ServerEmpty<void> = {
  mustProvideInitialContext<InitialContext>() {
    return ServerEmpty_mustProvideInitialContext<InitialContext>();
  },
  routes(routes) {
    return ServerEmpty_routes(this, routes);
  },
};

// [implementation]: stage transitions
// ---------------------------------------------------------
function ServerEmpty_mustProvideInitialContext<InitialContext>(): ServerEmpty<InitialContext> {
  return {
    mustProvideInitialContext<NewInitialContext>() {
      return ServerEmpty_mustProvideInitialContext<NewInitialContext>();
    },
    routes(routes) {
      return ServerEmpty_routes(this, routes);
    },
  };
}

function ServerEmpty_routes<InitialContext, Routes extends RecursiveDictionary<Procedure<InitialContext, any, any, any>>>(
  _oldServer: ServerEmpty<InitialContext>,
  routes: Routes,
): Server<InitialContext, Routes> {
  return {
    // the server's private property holding the procedure definitions
    routes,

    // the server's public method for invoking a route/procedure
    async invokeRoute({ path, input, initialContext }) {
      let output: unknown | undefined;
      let error: string | undefined;

      // try to invoke the route
      //   - if no exception is thrown, this function will only return `{ output }`
      //   - if an exception is thrown, this function will only return `{ error }`
      try {
        // validate `path`
        path = z.array(z.string()).parse(path);

        // find the `procedure` represented by `path`
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

        // run the procedure's `middlewares`
        let context = initialContext;
        for (const middleware of procedure.middlewares) {
          context = await middleware(context); // may throw exception
        }

        // validate `input` using the procedure's `inputSchema`
        const parsedInput = isDefined(procedure.inputSchema)
          ? procedure.inputSchema.parse(input) // may throw exception
          : undefined;

        // invoke the procedure's `handler`
        output = await procedure.handler(parsedInput, context); // may throw exception
      }
      catch (e) {
        error = String(e);
      }

      // response payload
      return (error !== undefined)
        ? { error }
        : { output };
    },
  };
}
