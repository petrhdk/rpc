import type { Procedure } from './procedure.ts';
import type { ClientToServerPayload, Router, ServerToClientPayload } from './router.ts';
import type { Promisify } from './util.ts';
import { isDefined } from '@petrhdk/util';

type inferProcedureDictionary<$RpcServer> =
  $RpcServer extends Router<any, infer $ProcedureDictionary>
    ? $ProcedureDictionary
    : never;

type inferClient<$ProcedureDictionary> = {
  [$K in keyof $ProcedureDictionary]:
  $ProcedureDictionary[$K] extends Procedure<any, any, infer $Input, infer $Output>
    ? (input: $Input) => Promisify<$Output>
    : inferClient<$ProcedureDictionary[$K]>;
};

type RequestSender = (_: ClientToServerPayload) => Promise<ServerToClientPayload>;

function getDummy() { // TODO: test if dummy can be shared by all proxies
  return () => {};
}

export function client<$RpcServer>(requestSender: RequestSender) {
  function createProxy(keyPath: string[]) {
    return new Proxy(getDummy(), {

      // when a property is accessed on the proxy
      get(_, key: string) {
        return createProxy([...keyPath, key]);
      },

      // when the proxy is used as a function
      async apply(_, __, args) {
        const { output, error } = await requestSender({ keyPath, rawInput: args[0] });
        if (isDefined(error)) {
          throw error;
        }
        return output;
      },
    });
  }

  return createProxy([]) as any as inferClient<inferProcedureDictionary<$RpcServer>>;
}
