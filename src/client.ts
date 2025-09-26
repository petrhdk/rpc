import type { Procedure } from './procedure.ts';
import type { ClientToServerPayload, Router, ServerToClientPayload } from './router.ts';
import type { Promisify } from './util.ts';

type inferRoutes<$Router> =
  $Router extends Router<any, infer $Routes>
    ? $Routes
    : never;

type inferClient<$Routes> = {
  [$K in keyof $Routes]:
  $Routes[$K] extends Procedure<any, any, infer $Input, infer $Output>
    ? (input: $Input) => Promisify<$Output>
    : inferClient<$Routes[$K]>;
};

type RequestSender = (_: ClientToServerPayload) => Promise<ServerToClientPayload>;

function getDummy() { // TODO: test if dummy can be shared by all proxies
  return () => {};
}

class RpcServerError extends Error {};

export function client<Router>(requestSender: RequestSender) {
  function createProxy(keyPath: string[]) {
    const functionName = keyPath.length ? keyPath.at(-1)! : 'rpcClient';

    // temporary container for renaming the `apply` method of the proxy, so that error stack trace will be more helpful
    const tempContainer = {
      async [functionName](_target: any, _thisArg: any, argArray: any[]) {
        const response = await requestSender({ keyPath, rawInput: argArray[0] });
        if ('error' in response) {
          throw new RpcServerError(`"${response.error}"`);
        }
        return response.output;
      },
    };

    return new Proxy(getDummy(), {

      // when the proxy is used as a function
      apply: tempContainer[functionName],

      // when a property is accessed on the proxy
      get(_, key: string) {
        return createProxy([...keyPath, key]);
      },
    });
  }

  return createProxy([]) as any as inferClient<inferRoutes<Router>>;
}
