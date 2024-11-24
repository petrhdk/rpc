import type { BuiltProcedure } from './procedure';

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
    async invoke(keyPath, rawInput) {
      let output, error;
      try {
      // find procedure
        let target: any = procedureDictionary;
        while (keyPath.length) {
          target = target[keyPath.shift()!];
        }
        const procedure = target as BuiltProcedure<any, any, any>;

        // run middleware
        let context;
        if ('_middlewares' in procedure) {
          for (const middleware of procedure._middlewares) {
            context = await middleware(context, rawInput); // may throw exception
          }
        }

        // parse input
        const parsedInput = '_inputValidator' in procedure
          ? procedure._inputValidator.parse(rawInput) // may throw exception
          : rawInput;

        // invoke
        await procedure._resolver?.(parsedInput, context);
      }
      catch (e) {
        error = e;
      }
      return { output, error };
    },
  };
  return server;
}
