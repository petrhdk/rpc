import type { BuiltProcedure } from './procedure';
import { isDefined } from '@petrhdk/util';

interface RecursiveDictionary<TLeave> {
  [key: string]: TLeave | RecursiveDictionary<TLeave>,
}

export interface RpcServer<_ProcedureDictionary> {
  invoke: (keyPath: string[], rawInput: unknown) => void,
};

export function createRpcServer<
  D extends RecursiveDictionary<BuiltProcedure<any, any, any>>,
>(
  procedureDictionary: D,
) {
  const server: RpcServer<D> = {
    /** user calls this function for every incoming request, to trigger a procedure in the server */
    async invoke(keyPath, rawInput) {
      let output, error;
      try {
        // find procedure
        let target: any = procedureDictionary;
        while (keyPath.length) {
          target = target[keyPath.shift()!];
        }
        const procedure = target as BuiltProcedure<any, any, any>;

        // parse input
        const parsedInput = isDefined(procedure.inputValidator)
          ? procedure.inputValidator.parse(rawInput) // may throw exception
          : rawInput;

        // run middleware
        let context;
        for (const middleware of procedure.middlewares) {
          context = await middleware(context, rawInput); // may throw exception
        }

        // invoke
        await procedure.resolver(parsedInput, context);
      }
      catch (e) {
        error = e;
      }
      return { output, error };
    },
  };
  return server;
}
