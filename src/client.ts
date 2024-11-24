import type { newProcedureBuilder } from './procedure.ts';
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

type inferClientProcedureDictionary<$ProcedureDictionary> = {
  [$K in keyof $ProcedureDictionary]:
  $ProcedureDictionary[$K] extends ReturnType<typeof newProcedureBuilder<
    infer _,
    infer $TParsedInput,
    infer $TOutput
  >>
    ? (input: $TParsedInput) => Promisify<$TOutput>
    : inferClientProcedureDictionary<$ProcedureDictionary[$K]>;
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

  return createProxy([]) as any as inferClientProcedureDictionary<inferProcedureDictionary<$RpcServer>>;
}
