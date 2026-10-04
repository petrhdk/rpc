import type { Procedure } from './procedure.ts';
import type { RequestPayload, ResponsePayload, Server } from './server.ts';
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

type RequestSender = ({ path, input }: RequestPayload) => Promise<ResponsePayload>;

export function createClient<Server>(requestSender: RequestSender) {
  return createProxy([]) as any as inferClient<inferRoutes<Server>>;

  function createProxy(currentPath: string[]) {
    const functionName = currentPath.length ? currentPath.at(-1)! : 'rpcClient';

    // temporary container for assigning a name to the `apply` method of the proxy
    // (so that error stack traces will show the correct function name)
    const tempContainer = {
      // becomes the `apply` function for the Proxy created below
      async [functionName](_target: any, _thisArg: any, argArray: any[]) {
        // communicate with the server via the function configured by the library user
        const responsePayload = await requestSender({
          path: currentPath,
          input: argArray[0],
        });
        if ('error' in responsePayload) {
          // re-create the server exception on the client.
          // the custom Error class creates a more beautiful entry in the console
          class RpcServerError extends Error {};
          throw new RpcServerError(`"${responsePayload.error}"`);
        }
        return responsePayload.output;
      },
    };

    return new Proxy(() => {}, {
      // when the proxy is used as a function
      apply: tempContainer[functionName],

      // when a property is accessed on the proxy
      get(_, key: string) {
        return createProxy([...currentPath, key]);
      },
    });
  }
}
