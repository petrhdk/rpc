# Installation
```console
npm install @petrhdk/rpc
```

<br><br>

# Usage
```ts
// declare type utils
// ---------------------------------------------------------
interface MyServerContext {
  user: string,
}

// define routes/procedures
// ---------------------------------------------------------
const procedure = rpc.procedure
  .initialContext<MyServerContext>()
  .use(({ user }) => ({ user, abc: 123 }))
  .use((previousContext) => ({ ...previousContext, xyz: 456 }))
  .input(z.string())
  .define((input: string, context) => {
    console.log({ context, input });
    return 123;
  });

const server = rpc.server
  .initialContext<MyServerContext>()
  .routes({
    call: {
      me: {
        maybe: procedure,
      },
    },
  });
export type MyServer = typeof server;

// test route invocation
// ---------------------------------------------------------
server.invokeRoute(
  {
    path: ['call', 'me', 'maybe'],
    input: 'asdf',
  },
  { user: 'ye' },
);

// create HTTP server (which forwards to RPC server)
// ---------------------------------------------------------
http.createServer(async (request, response) => {
  if (request.method === 'POST' && request.url!.startsWith('/rpc/')) {
    const serverToClientPayload = await server.invokeRoute(
      {
        path: request.url!.replace(/^\/rpc\//, '').split('/'),
        input: JSON.parse(await readBodyAsString(request)),
      },
      { user: 'ye' },
    );
    response.writeHead(200);
    response.end(JSON.stringify(serverToClientPayload));
  }
}).listen(3000);

// create RPC client (which talks to server via HTTP)
// ---------------------------------------------------------
const client = rpc.createClient<MyServer>(async ({ path, input }) => {
  const httpResponse = await fetch(
    `https://example.com/rpc/${path.join('/')}`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return await httpResponse.json() as ServerToClientPayload;
});

// test the client
// ---------------------------------------------------------
client.call.me.maybe('asdf');
```
(source: [`src/_example.ts`](src/_example.ts))

<br><br>

# Query builder
![](docs/procedure-builder.drawio.svg)

<br><br>

# Server builder
![](docs/server-builder.drawio.svg)
