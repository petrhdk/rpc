import type { Procedure } from './procedure.ts';
import type { ClientToServerPayload, Server, ServerToClientPayload } from './server.ts';
import type { Promisify } from './util.ts';

// type function to extract the second template parameter
// from a given 'Server' type
type inferRoutes<$Server> =
  $Server extends Server<any, infer $Routes>
    ? $Routes
    : never;

// recursive type function that generates a nested dictionary type based off
// the nested routes dictionary from the server
type inferClient<$Routes> = {
  [$K in keyof $Routes]:
  $Routes[$K] extends Procedure<any, any, infer $Input, infer $Output>
    ? (input: $Input) => Promisify<$Output>
    : inferClient<$Routes[$K]>;
};

function proxyTargetDummy() {}

type ClientRequestSender = (
  clientToServerPayload: ClientToServerPayload,
) => Promise<ServerToClientPayload>;

export function createClient<Server>(requestSender: ClientRequestSender) {
  return createProxy([]) as any as inferClient<inferRoutes<Server>>;

  function createProxy(currentPath: string[]) {
    const functionName = currentPath.length ? currentPath.at(-1)! : 'rpcClient';

    // temporary container for assigning a name to the `apply` method of the proxy
    // (so that error stack traces will show the correct function name)
    const tempContainer = {
      // becomes the `apply` function for the Proxy created below
      async [functionName](_target: any, _thisArg: any, argArray: any[]) {
        // communicate with the server via the function configured by the library user
        const clientToServerPayload = {
          path: currentPath,
          input: argArray[0],
        };
        const serverToClientPayload = await requestSender(clientToServerPayload);
        if ('error' in serverToClientPayload) {
          // re-create the server exception on the client.
          // the custom Error class creates a more beautiful entry in the console
          class RpcServerError extends Error {};
          throw new RpcServerError(`"${serverToClientPayload.error}"`);
        }
        return serverToClientPayload.output;
      },
    };

    return new Proxy(proxyTargetDummy, {
      // when the proxy is used as a function
      apply: tempContainer[functionName],

      // when a property is accessed on the proxy
      get(_, key: string) {
        return createProxy([...currentPath, key]);
      },
    });
  }
}
