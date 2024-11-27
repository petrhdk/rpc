import type { BuiltProcedure } from './procedure';
import { isDefined } from '@petrhdk/util';

interface RecursiveDictionary<TLeaf> {
  [key: string]: TLeaf | RecursiveDictionary<TLeaf>,
}

export interface BuiltServer<_ServerContext, _Routes> {};

export const rpcServer = {
  setup<ServerContext = undefined>(
    serverSetup: (
      invokeRoute: (keyPath: string[], rawInput: unknown, serverContext: ServerContext) => Promise<any>
    ) => void,
  ) {
    return {
      routes<Routes extends RecursiveDictionary<BuiltProcedure<ServerContext, any, any, any>>>(routes: Routes) {
        return {
          listen() {
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

            return {} as BuiltServer<ServerContext, Routes>;
          },
        };
      },
    };
  },
};
