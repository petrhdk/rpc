# rpc

```ts
const a = procedure
  .use(() => ({ abc: 123 }))
  .use((context) => ({ ...context, xyz: 123 }))
  .input(z.string())
  .define(({ context, input }) => {
    console.log({ context, input });
  });
```
