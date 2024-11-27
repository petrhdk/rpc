type Middleware<ServerContext, Context, NewContext> = (serverContext: ServerContext, context: Context) => Promise<NewContext> | NewContext;

type Resolver<Context, Input, Output> = (input: Input, context: Context) => Promise<Output> | Output;

// supports zod
interface InputValidator<Input> {
  parse: (rawInput: unknown) => Input,
}

/* SEE README TO UNDERSTAND THE FLOW BETWEEN THE FOLLOWING TYPES */

interface Procedure<ServerContext, Context> {
  /** @internal */
  middlewares: Middleware<any, any, any>[],
  use: <NewContext>(middleware: Middleware<ServerContext, Context, NewContext>) => Procedure<ServerContext, NewContext>,
  input: <NewInput>(inputValidator: InputValidator<NewInput>) => ProcedureWithInputValidator<ServerContext, Context, NewInput>,
  define: <NewInput, NewOutput>(resolver: Resolver<Context, NewInput, NewOutput>) => BuiltProcedure<ServerContext, Context, NewInput, NewOutput>,
}

interface ProcedureWithInputValidator<ServerContext, Context, Input> {
  /** @internal */
  middlewares: Middleware<any, any, any>[],
  /** @internal */
  inputValidator: InputValidator<Input>,
  define: <NewOutput>(resolver: Resolver<Context, Input, NewOutput>) => BuiltProcedure<ServerContext, Context, Input, NewOutput>,
}

export interface BuiltProcedure<_ServerContext, Context, Input, Output> {
  /** @internal */
  middlewares: Middleware<any, any, any>[],
  /** @internal */
  inputValidator?: InputValidator<Input>,
  /** @internal */
  resolver: Resolver<Context, Input, Output>,
}

export function procedure<ServerContext>(): Procedure<ServerContext, undefined> {
  return {
    middlewares: [],
    use(middleware) {
      return addMiddleware_ProcedureEmpty(this, middleware);
    },
    input(inputValidator) {
      return addInputValidator_ProcedureEmpty(this, inputValidator);
    },
    define(resolver) {
      return addResolver_ProcedureEmpty(this, resolver);
    },
  };
}

function addMiddleware_ProcedureEmpty<ServerContext, Context, NewContext>(
  { middlewares }: Procedure<ServerContext, Context>,
  middleware: Middleware<ServerContext, Context, NewContext>,
): Procedure<ServerContext, NewContext> {
  return {
    middlewares: [...middlewares, middleware],
    use(middleware) {
      return addMiddleware_ProcedureEmpty(this, middleware);
    },
    input(inputValidator) {
      return addInputValidator_ProcedureEmpty(this, inputValidator);
    },
    define(resolver) {
      return addResolver_ProcedureEmpty(this, resolver);
    },
  };
}

function addInputValidator_ProcedureEmpty<ServerContext, Context, NewInput>(
  { middlewares }: Procedure<any, Context>,
  inputValidator: InputValidator<NewInput>,
): ProcedureWithInputValidator<ServerContext, Context, NewInput> {
  return {
    middlewares,
    inputValidator,
    define(resolver) {
      return addResolver_ProcedureWithInputValidator(this, resolver);
    },
  };
}

function addResolver_ProcedureEmpty<ServerContext, Context, NewInput, NewOutput>(
  { middlewares }: Procedure<any, Context>,
  resolver: Resolver<Context, NewInput, NewOutput>,
): BuiltProcedure<ServerContext, Context, NewInput, NewOutput> {
  return {
    middlewares,
    resolver,
  };
}

function addResolver_ProcedureWithInputValidator<ServerContext, Context, Input, NewOutput>(
  { middlewares, inputValidator }: ProcedureWithInputValidator<ServerContext, Context, Input>,
  resolver: Resolver<Context, Input, NewOutput>,
): BuiltProcedure<ServerContext, Context, Input, NewOutput> {
  return {
    middlewares,
    inputValidator,
    resolver,
  };
}
