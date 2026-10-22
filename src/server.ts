import type { Procedure } from './procedure.ts';
import type { RecursiveDictionary } from './util.ts';
import { isDefined } from '@petrhdk/util';

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

type ProcedureWithPartialInitialContextRequirement<InitialContext, _1, _2, _3> =
  | Procedure<InitialContext, _1, _2, _3>
  | Procedure<Partial<InitialContext>, _1, _2, _3>
  | Procedure<void, _1, _2, _3>;

// ------------------------------------------------------------
// server types
// ------------------------------------------------------------
interface ServerEmpty {
  mustProvideInitialContext: <InitialContext>() => ServerWithInitialContext<InitialContext>,
  routes: <Routes extends RecursiveDictionary<Procedure<void, any, any, any>>>(routes: Routes) => Server<void, Routes>,
}

interface ServerWithInitialContext<InitialContext> {
  routes: <Routes extends RecursiveDictionary<ProcedureWithPartialInitialContextRequirement<InitialContext, any, any, any>>>(routes: Routes) => Server<InitialContext, Routes>,
}

export interface Server<InitialContext, Routes> {
  _routes: Routes,

  invokeRoute: ({ path, input, initialContext }: {
    path: string[],
    input: unknown,
    initialContext: InitialContext,
  }) => Promise<{
    responsePayload: ResponsePayload,
    error?: Error | unknown,
  }>,
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
  Routes extends RecursiveDictionary<ProcedureWithPartialInitialContextRequirement<InitialContext, any, any, any>>,
>(routes: Routes): Server<InitialContext, Routes> {
  return {
    _routes: routes,

    async invokeRoute({ path, input, initialContext }) {
      let responsePayload: ResponsePayload;
      let error: Error | unknown | undefined;

      // try to invoke the route
      //   - if no exception is thrown, this function will only return `{ output }`
      //   - if an exception is thrown, this function will only return `{ error }`
      try {
        // validate `path`
        if (!Array.isArray(path) || path.some((string) => typeof string !== 'string')) {
          throw new Error('Path has an unsupported format (it should be an array of strings)');
        }

        // find the `procedure` represented by `path`
        // (by traversing into the routes, starting at the top-level dictionary)
        let target: any = this._routes;
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
        for (const middleware of procedure._middlewares) {
          context = await middleware(context); // may throw exception
        }

        // validate `input` using the procedure's `inputSchema`
        const parsedInput = isDefined(procedure._inputSchema)
          ? procedure._inputSchema.parse(input) // may throw exception
          : undefined;

        // invoke the procedure's `handler`
        responsePayload = {
          output: await procedure._handler(parsedInput, context), // may throw exception
        };
      }
      catch (e) {
        responsePayload = {
          error: String(e),
        };
        error = e;
      }

      // give control back to the server endpoint
      return { responsePayload, error };
    },
  };
}
