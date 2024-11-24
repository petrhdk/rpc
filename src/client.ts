import type { Procedure } from './procedure.ts';
import type { RpcServer } from './server.ts';

type inferProcedureDictionary<$RpcServer> =
  $RpcServer extends RpcServer<infer $ProcedureDictionary>
    ? $ProcedureDictionary
    : never;

/**
 * Wraps the return type of any given function type in Promise<> if it is not already a Promise
 */
type Promisify<$T> = $T extends Promise<any>
  ? $T
  : Promise<$T>;

type inferClient<$ProcedureDictionary> = {
  [$K in keyof $ProcedureDictionary]:
  $ProcedureDictionary[$K] extends Procedure<
    any,
    any,
    any,
    infer $Input,
    any,
    infer $Output
  >
    ? (input: $Input) => Promisify<$Output>
    : inferClient<$ProcedureDictionary[$K]>;
};

export function createRpcClient<$RpcServer>(requestHandler: ((keyPath: string[], args: any[]) => Promise<any>)) {
  function createProxy(keyPath: string[]) {
    const dummy = () => {};

    return new Proxy(dummy, {
      // when a property is accessed on the proxy
      get(_target, key: string) {
        return createProxy([...keyPath, key]);
      },

      // when the proxy is used as a function
      apply(_target, _thisArg, args) {
        return Promise.resolve(requestHandler(keyPath, args));
      },
    });
  }

  return createProxy([]) as any as inferClient<inferProcedureDictionary<$RpcServer>>;
}
