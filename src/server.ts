import type { Procedure } from './procedure.ts';
import type { RecursiveDictionary } from './util.ts';
import { isDefined } from '@petrhdk/util';
import { z } from 'zod';

// ------------------------------------------------------------
// type utils
// ------------------------------------------------------------
export interface RequestPayload {
  path: string[],
  input: unknown,
}

export type ResponsePayload =
  | { output: unknown }
  | { error: string };

// ------------------------------------------------------------
// server types
// ------------------------------------------------------------
interface ServerEmpty {
  mustProvideInitialContext: <InitialContext>() => ServerWithInitialContext<InitialContext>,
  routes: <Routes extends RecursiveDictionary<Procedure<void, any, any, any>>>(routes: Routes) => Server<void, Routes>,
}

interface ServerWithInitialContext<InitialContext> {
  routes: <Routes extends RecursiveDictionary<Procedure<InitialContext, any, any, any>>>(routes: Routes) => Server<InitialContext, Routes>,
}

export interface Server<InitialContext, Routes> {
  /** @internal */
  routes: Routes,

  invokeRoute: ({ path, input, initialContext }: { path: string[], input: unknown, initialContext: InitialContext }) => Promise<ResponsePayload>,
}

// ------------------------------------------------------------
// implementation
// ------------------------------------------------------------
export const server: ServerEmpty = {
  mustProvideInitialContext,
  routes,
};

function mustProvideInitialContext<InitialContext>(): ServerWithInitialContext<InitialContext> {
  return {
    routes,
  };
}

function routes<
  InitialContext,
  Routes extends RecursiveDictionary<Procedure<InitialContext, any, any, any>>,
>(routes: Routes): Server<InitialContext, Routes> {
  return {
    routes,

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
