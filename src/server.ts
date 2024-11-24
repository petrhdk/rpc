import type { Procedure } from './procedure';
import { isDefined } from '@petrhdk/util';

interface RecursiveDictionary<TLeave> {
  [key: string]: TLeave | RecursiveDictionary<TLeave>,
}

export interface RpcServer<_ProcedureDictionary> {
  invoke: (keyPath: string[], rawInput: unknown) => void,
};

type BuiltProcedure = Procedure<
  any,
  any,
  any,
  any,
  true, // TODO: this is currently not enforced by Typescript, mysterious
  any
>;

export function createRpcServer<
  D extends RecursiveDictionary<BuiltProcedure>,
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
        const procedure = target as BuiltProcedure;

        // run middleware
        let context;
        for (const middleware of procedure._middlewares ?? []) {
          context = await middleware(context, rawInput); // may throw exception
        }

        // parse input
        const parsedInput = isDefined(procedure._inputValidator)
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
