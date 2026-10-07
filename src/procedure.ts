import type { MaybePromise } from './util.ts';

// ------------------------------------------------------------
// type utils
// ------------------------------------------------------------
type Middleware<OldContext, NewContext> =
  (context: OldContext) => MaybePromise<NewContext>;

type Handler<FinalContext, Input, Output> =
  (input: Input, context: FinalContext) => MaybePromise<Output>;

interface InputSchema<Input> { // based on `zod`
  parse: (rawInput: unknown) => Input,
}

// ------------------------------------------------------------
// procedure types
// ------------------------------------------------------------
interface ProcedureEmpty {
  needsInitialContext: <InitialContext>() => ProcedureWithInitialContext<InitialContext>,
  use: <NewFinalContext>(middleware: Middleware<void, NewFinalContext>) => ProcedureWithMiddleware<void, NewFinalContext>,
  input: <Input>(inputSchema: InputSchema<Input>) => ProcedureWithInputSchema<void, void, Input>,
  define: <Output>(handler: Handler<void, void, Output>) => Procedure<void, void, void, Output>,
};

interface ProcedureWithInitialContext<InitialContext> {
  use: <NewFinalContext>(middleware: Middleware<InitialContext, NewFinalContext>) => ProcedureWithMiddleware<InitialContext, NewFinalContext>,
  input: <Input>(inputSchema: InputSchema<Input>) => ProcedureWithInputSchema<InitialContext, InitialContext, Input>,
  define: <Output>(handler: Handler<InitialContext, void, Output>) => Procedure<InitialContext, InitialContext, void, Output>,
};

interface ProcedureWithMiddleware<InitialContext, FinalContext> {
  /** @internal */
  middlewares:
    | [Middleware<InitialContext, FinalContext>]
    | [Middleware<InitialContext, any>, ...Middleware<any, any>[], Middleware<any, FinalContext>],

  use: <NewFinalContext>(middleware: Middleware<FinalContext, NewFinalContext>) => ProcedureWithMiddleware<InitialContext, NewFinalContext>,
  input: <Input>(inputSchema: InputSchema<Input>) => ProcedureWithInputSchema<InitialContext, FinalContext, Input>,
  define: <Output>(handler: Handler<FinalContext, void, Output>) => Procedure<InitialContext, FinalContext, void, Output>,
};

interface ProcedureWithInputSchema<InitialContext, FinalContext, Input> {
  /** @internal */
  middlewares:
    | []
    | [Middleware<InitialContext, FinalContext>]
    | [Middleware<InitialContext, any>, ...Middleware<any, any>[], Middleware<any, FinalContext>],

  /** @internal */
  inputSchema: InputSchema<Input>,

  define: <Output>(handler: Handler<FinalContext, Input, Output>) => Procedure<InitialContext, FinalContext, Input, Output>,
};

export interface Procedure<InitialContext, FinalContext, Input, Output> {
  /** @internal */
  middlewares:
    | []
    | [Middleware<InitialContext, FinalContext>]
    | [Middleware<InitialContext, any>, ...Middleware<any, any>[], Middleware<any, FinalContext>],

  /** @internal */
  inputSchema: [Input] extends [void]
    ? InputSchema<Input> | undefined
    : InputSchema<Input>,

  /** @internal */
  handler: Handler<FinalContext, Input, Output>,

  /**
   * internal type discriminator.
   * (this value is never actually assigned, but we declare it (as optional) in this type interface so that typescript will not interpret this interface as type `{}` after stripping all properties marked as `@internal` (as it happens when building the library .d.ts files) - because this would mean that in a user's application code ANY value passes the test `value extends Procedure`, which is not what we want.)
   */
  $type?: 'rpc.Procedure',
};

// ------------------------------------------------------------
// implementation
// ------------------------------------------------------------
export const procedure: ProcedureEmpty = {
  needsInitialContext,
  use,
  input,
  define,
};

function needsInitialContext(this: any) {
  return {
    use,
    input,
    define,
  };
}

function use(this: any, middleware: any): any {
  return {
    middlewares: [...this.middlewares, middleware],
    use,
    input,
    define,
  };
}

function input(this: any, inputSchema: any): any {
  return {
    middlewares: this.middlewares ?? [],
    inputSchema,
    define,
  };
}

function define(this: any, handler: any): any {
  return {
    middlewares: this.middlewares ?? [],
    inputSchema: this.inputSchema ?? undefined,
    handler,
  };
}
