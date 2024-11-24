import type { newProcedureBuilder } from './procedure';
import { isDefined } from '@petrhdk/util';

interface RecursiveDictionary<TLeave> {
  [key: string]: TLeave | RecursiveDictionary<TLeave>,
}

export interface RpcServer<_ProcedureDictionary> {
  invoke: (keyPath: string[], rawInput: unknown) => void,
};

export function createRpcServer<
  D extends RecursiveDictionary<ReturnType<typeof newProcedureBuilder>>,
>(
  procedureDictionary: D,
) {
  const server: RpcServer<D> = {
    invoke(keyPath: string[], rawInput: unknown) {
      // find procedure
      let target: any = procedureDictionary;
      while (keyPath.length) {
        target = target[keyPath.shift()!];
      }
      const procedure = target as ReturnType<typeof newProcedureBuilder>;

      // run middleware
      let context;
      for (const middleware of procedure._def.middlewares) {
        context = middleware(context, rawInput); // may throw exception
      }

      // parse input
      const parsedInput = isDefined(procedure._def.inputValidator)
        ? procedure._def.inputValidator.parse(rawInput) // may throw exception
        : rawInput;

      // invoke
      procedure._def.handler?.(parsedInput, context);
    },
  };
  return server;
}
