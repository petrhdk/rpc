import { Buffer } from 'node:buffer';
import * as http from 'node:http';
import { z } from 'zod';
import * as rpc from './index.ts';

// ---------------------------------------------------------
// backend code
// ---------------------------------------------------------

export interface MyServerContext {
  requestHeaders: http.IncomingHttpHeaders,
};

const server = rpc.server
  .initialContext<MyServerContext>()
  .routes({
    v1: {
      getItem: rpc.procedure
        .expects<MyServerContext>()
        .use(({ requestHeaders }) => { // eslint-disable-line unused-imports/no-unused-vars
          // ...
          return { authenticatedUser: 'user1' };
        })
        .input(z.object({
          itemId: z.string(),
        }))
        .define(({ itemId }, { authenticatedUser }) => { // eslint-disable-line unused-imports/no-unused-vars
          // ...
          const item = { /* ... */ };
          return item;
        }),
    },
  });
export type MyServer = typeof server;

http.createServer(async (request, response) => {
  // handle RPC requests
  if (request.method === 'POST') {
    const responsePayload = await server.invokeRoute({
      path: (request.url ?? '/').split('/').slice(1),
      input: JSON.parse(await readBodyAsString(request)),
      initialContext: {
        requestHeaders: request.headers,
      },
    });
    response.writeHead(200);
    response.end(JSON.stringify(responsePayload));
  }

  // handle preflight requests
  if (request.method === 'OPTIONS') {
    // ...
  }
}).listen(3000);

async function readBodyAsString(request: http.IncomingMessage) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}

// ---------------------------------------------------------
// frontend code
// ---------------------------------------------------------

const client = rpc.createClient<MyServer>(async ({ path, input }) => {
  const httpResponse = await fetch(
    `https://example.com/rpc/${path.join('/')}`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return await httpResponse.json() as rpc.ResponsePayload;
});

client.v1.getItem({ itemId: 'abc' });
