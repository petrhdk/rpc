import type { BuiltProcedure } from './procedure';
import { isDefined } from '@petrhdk/util';

interface RecursiveDictionary<TLeave> {
  [key: string]: TLeave | RecursiveDictionary<TLeave>,
}

type ServerSetupFunction<ServerContext> = (
  invokeRoute: (keyPath: string[], rawInput: unknown, serverContext: ServerContext) => Promise<any>
) => void;

interface ServerEmpty {
  setup: <ServerContext>(serverSetup: ServerSetupFunction<ServerContext>) => ServerWithSetup<ServerContext>,
}

interface ServerWithSetup<ServerContext> {
  /** @internal */
  def: {
    serverSetup: ServerSetupFunction<ServerContext>,
  },
  routes: <Routes extends RecursiveDictionary<BuiltProcedure<ServerContext, any, any, any>>>(
    routes: Routes,
  ) => ServerWithRoutes<ServerContext, Routes>,
}

interface ServerWithRoutes<ServerContext, Routes> {
  /** @internal */
  def: {
    serverSetup: ServerSetupFunction<ServerContext>,
    routes: Routes,
  },
  listen: () => BuiltServer<ServerContext, Routes>,
}

export interface BuiltServer<_ServerContext, _Routes> {}

/**
 * user calls like this:
 * ```ts
 * rpcServer.setup(invokeRoute => ...).routes({ ... }).listen();
 * ```
 */
export const rpcServer: ServerEmpty = {
  setup(serverSetup) {
    return addSetup_ServerEmpty(serverSetup);
  },
};

function addSetup_ServerEmpty<ServerContext>(
  serverSetup: ServerSetupFunction<ServerContext>,
): ServerWithSetup<ServerContext> {
  return {
    def: { serverSetup },
    routes(routes) {
      return addRoutes_ServerWithSetup(this, routes);
    },
  };
}

function addRoutes_ServerWithSetup<ServerContext, Routes extends RecursiveDictionary<BuiltProcedure<ServerContext, any, any, any>>>(
  { def: { serverSetup } }: ServerWithSetup<ServerContext>,
  routes: Routes,
): ServerWithRoutes<ServerContext, Routes> {
  return {
    def: { serverSetup, routes },
    listen() {
      return listen_ServerWithRoutes(this);
    },
  };
}

function listen_ServerWithRoutes<ServerContext, Routes>(
  { def: { serverSetup, routes } }: ServerWithRoutes<ServerContext, Routes>,
): BuiltServer<ServerContext, Routes> {
  serverSetup(async (keyPath, rawInput, serverContext) => {
    let output, error;
    try {
      // find procedure
      let target: any = routes;
      while (keyPath.length) {
        target = target[keyPath.shift()!];
      }
      const procedure = target as BuiltProcedure<ServerContext, any, any, any>;

      // run middleware
      let context;
      for (const middleware of procedure.middlewares) {
        context = await middleware(serverContext, context); // may throw exception
      }

      // parse input
      const parsedInput = isDefined(procedure.inputValidator)
        ? procedure.inputValidator.parse(rawInput) // may throw exception
        : rawInput;

      // invoke
      output = await procedure.resolver(parsedInput, context);
    }
    catch (e) {
      error = e;
    }
    return { output, error };
  });

  return {};
}
