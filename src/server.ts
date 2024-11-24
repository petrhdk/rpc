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
  any,
  any
>;

export function createRpcServer<
  D extends RecursiveDictionary<BuiltProcedure>,
>(
  procedureDictionary: D,
) {
  const server: RpcServer<D> = {
    invoke(keyPath, rawInput) {
      // find procedure
      let target: any = procedureDictionary;
      while (keyPath.length) {
        target = target[keyPath.shift()!];
      }
      const procedure = target as BuiltProcedure;

      // run middleware
      let context;
      for (const middleware of procedure._middlewares ?? []) {
        context = middleware(context, rawInput); // may throw exception
      }

      // parse input
      const parsedInput = isDefined(procedure._inputValidator)
        ? procedure._inputValidator.parse(rawInput) // may throw exception
        : rawInput;

      // invoke
      procedure._resolver?.(parsedInput, context);
    },
  };
  return server;
}
