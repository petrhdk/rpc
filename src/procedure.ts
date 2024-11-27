type Middleware<ServerContext, Context, NewContext> = (serverContext: ServerContext, context: Context) => Promise<NewContext> | NewContext;

type Resolver<Context, Input, Output> = (input: Input, context: Context) => Promise<Output> | Output;

// supports zod
interface InputValidator<Input> {
  parse: (rawInput: unknown) => Input,
}

/* SEE README TO UNDERSTAND THE FLOW BETWEEN THE FOLLOWING TYPES */

interface ProcedureWithMiddlewares<ServerContext, Context> {
  /** @internal */
  middlewares: Middleware<ServerContext, any, any>[],
  use: <NewContext>(middleware: Middleware<ServerContext, Context, NewContext>) => ProcedureWithMiddlewares<ServerContext, NewContext>,
  input: <NewInput>(inputValidator: InputValidator<NewInput>) => ProcedureWithInputValidator<ServerContext, Context, NewInput>,
  define: <NewInput, NewOutput>(resolver: Resolver<Context, NewInput, NewOutput>) => BuiltProcedure<ServerContext, Context, NewInput, NewOutput>,
}

interface ProcedureWithInputValidator<ServerContext, Context, Input> {
  /** @internal */
  middlewares: Middleware<ServerContext, any, any>[],
  /** @internal */
  inputValidator: InputValidator<Input>,
  define: <NewOutput>(resolver: Resolver<Context, Input, NewOutput>) => BuiltProcedure<ServerContext, Context, Input, NewOutput>,
}

export interface BuiltProcedure<ServerContext, Context, Input, Output> {
  /** @internal */
  middlewares: Middleware<ServerContext, any, any>[],
  /** @internal */
  inputValidator?: InputValidator<Input>,
  /** @internal */
  resolver: Resolver<Context, Input, Output>,
}

export function procedure<ServerContext = undefined>(): ProcedureWithMiddlewares<ServerContext, undefined> {
  return {
    middlewares: [],
    use(middleware) {
      return addMiddleware_ProcedureWithMiddlewares(this, middleware);
    },
    input(inputValidator) {
      return addInputValidator_ProcedureWithMiddlewares(this, inputValidator);
    },
    define(resolver) {
      return addResolver_ProcedureWithMiddlewares(this, resolver);
    },
  };
}

function addMiddleware_ProcedureWithMiddlewares<ServerContext, Context, NewContext>(
  { middlewares }: ProcedureWithMiddlewares<ServerContext, Context>,
  middleware: Middleware<ServerContext, Context, NewContext>,
): ProcedureWithMiddlewares<ServerContext, NewContext> {
  return {
    middlewares: [...middlewares, middleware],
    use(middleware) {
      return addMiddleware_ProcedureWithMiddlewares(this, middleware);
    },
    input(inputValidator) {
      return addInputValidator_ProcedureWithMiddlewares(this, inputValidator);
    },
    define(resolver) {
      return addResolver_ProcedureWithMiddlewares(this, resolver);
    },
  };
}

function addInputValidator_ProcedureWithMiddlewares<ServerContext, Context, NewInput>(
  { middlewares }: ProcedureWithMiddlewares<any, Context>,
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

function addResolver_ProcedureWithMiddlewares<ServerContext, Context, NewInput, NewOutput>(
  { middlewares }: ProcedureWithMiddlewares<any, Context>,
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
