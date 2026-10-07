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
  inputSchema: [Input] extends [void] ? (InputSchema<Input> | undefined) : InputSchema<Input>,

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
  use(middleware) { return use(this, middleware); },
  input(inputSchema) { return input(this, inputSchema); },
  define(handler) { return define(this, handler); },
};

function needsInitialContext<InitialContext>(): ProcedureWithInitialContext<InitialContext> {
  return {
    use(middleware) { return use(this, middleware); },
    input(inputSchema) { return input(this, inputSchema); },
    define(handler) { return define(this, handler); },
  };
}

function use<InitialContext, OldFinalContext, NewFinalContext>(
  oldProcedure:
    | ProcedureEmpty
    | ProcedureWithInitialContext<InitialContext>
    | ProcedureWithMiddleware<InitialContext, OldFinalContext>,
  middleware: Middleware<InitialContext, NewFinalContext> | Middleware<OldFinalContext, NewFinalContext>,
): ProcedureWithMiddleware<InitialContext, NewFinalContext> {
  return {
    middlewares: ('middlewares' in oldProcedure)
      ? [...oldProcedure.middlewares, middleware as Middleware<OldFinalContext, NewFinalContext>]
      : [middleware as Middleware<InitialContext, NewFinalContext>],
    use(middleware) { return use(this, middleware); },
    input(inputSchema) { return input(this, inputSchema); },
    define(handler) { return define(this, handler); },
  };
}

function input<InitialContext, FinalContext, Input>(
  oldProcedure:
    | ProcedureEmpty
    | ProcedureWithInitialContext<InitialContext>
    | ProcedureWithMiddleware<InitialContext, FinalContext>,
  inputSchema: InputSchema<Input>,
): ProcedureWithInputSchema<InitialContext, FinalContext, Input> {
  return {
    middlewares: ('middlewares' in oldProcedure) ? oldProcedure.middlewares : [],
    inputSchema,
    define(handler) { return define(this, handler); },
  };
}

function define<InitialContext, FinalContext, Input, Output>(
  oldProcedure:
    | ProcedureEmpty
    | ProcedureWithInitialContext<InitialContext>
    | ProcedureWithMiddleware<InitialContext, FinalContext>
    | ProcedureWithInputSchema<InitialContext, FinalContext, Input>,
  handler: Handler<FinalContext, Input, Output>,
): Procedure<InitialContext, FinalContext, Input, Output> {
  return {
    middlewares: ('middlewares' in oldProcedure) ? oldProcedure.middlewares : [],
    inputSchema: (
      ('inputSchema' in oldProcedure) ? oldProcedure.inputSchema : undefined
    ) as ([Input] extends [void] ? (InputSchema<Input> | undefined) : InputSchema<Input>),
    handler,
  };
}
