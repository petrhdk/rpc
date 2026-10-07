import type { MaybePromise } from './util.ts';

// ------------------------------------------------------------
// type utils
// ------------------------------------------------------------
type Middleware<OldContext, NewContext> =
  (context: OldContext) => MaybePromise<NewContext>;

type MiddlewareChain<InitialContext, FinalContext> =
  | [Middleware<InitialContext, FinalContext>]
  | [Middleware<InitialContext, any>, ...Middleware<any, any>[], Middleware<any, FinalContext>];

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
  _middlewares: MiddlewareChain<InitialContext, FinalContext>,

  use: <NewFinalContext>(middleware: Middleware<FinalContext, NewFinalContext>) => ProcedureWithMiddleware<InitialContext, NewFinalContext>,
  input: <Input>(inputSchema: InputSchema<Input>) => ProcedureWithInputSchema<InitialContext, FinalContext, Input>,
  define: <Output>(handler: Handler<FinalContext, void, Output>) => Procedure<InitialContext, FinalContext, void, Output>,
};

interface ProcedureWithInputSchema<InitialContext, FinalContext, Input> {
  _middlewares:
    | []
    | MiddlewareChain<InitialContext, FinalContext>,

  _inputSchema: InputSchema<Input>,

  define: <Output>(handler: Handler<FinalContext, Input, Output>) => Procedure<InitialContext, FinalContext, Input, Output>,
};

export interface Procedure<InitialContext, FinalContext, Input, Output> {
  _middlewares:
    | []
    | MiddlewareChain<InitialContext, FinalContext>,

  _inputSchema: [Input] extends [void]
    ? InputSchema<Input> | undefined
    : InputSchema<Input>,

  _handler: Handler<FinalContext, Input, Output>,
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
