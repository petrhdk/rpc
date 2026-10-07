import type { Procedure } from './procedure.ts';
import type { RequestPayload, ResponsePayload, Server } from './server.ts';
import type { Promisify } from './util.ts';

// ------------------------------------------------------------
// type utils
// ------------------------------------------------------------

/**
 * A type function to extract the `Routes` template parameter from from a given `Server<InitialContext, Routes>` type.
 */
type inferRoutes<$Server> =
  $Server extends Server<any, infer $Routes>
    ? $Routes
    : never;

/**
 * A type function that recursively generates a nested dictionary type based on a `Routes` dictionary type.
 */
type inferClient<$Routes> = {
  [$K in keyof $Routes]:
  $Routes[$K] extends Procedure<any, any, infer $Input, infer $Output>
    ? (input: $Input) => Promisify<$Output>
    : inferClient<$Routes[$K]>;
};

/**
 * The type of the function passed to `.sendRequests()`.
 */
type RequestSender = ({ path, input }: RequestPayload) => Promise<ResponsePayload>;

// ------------------------------------------------------------
// client types
// ------------------------------------------------------------
interface ClientEmpty {
  forServer: <Server>() => ClientWithRoutes<inferRoutes<Server>>,
}

interface ClientWithRoutes<Routes> {
  sendRequests: (requestSender: RequestSender) => inferClient<Routes>,
}

// ------------------------------------------------------------
// implementation
// ------------------------------------------------------------

export const client: ClientEmpty = {
  forServer,
};

function forServer() {
  return {
    sendRequests,
  };
}

function sendRequests<Routes>(requestSender: RequestSender): inferClient<Routes> {
  return createProxy([]) as any as inferClient<Routes>;

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
