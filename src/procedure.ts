type Middleware<ContextIn, ContextOut> = (context: ContextIn, rawInput: unknown) => Promise<ContextOut> | ContextOut;

type Resolver<Context, Input, Output> = (input: Input, context: Context) => Promise<Output> | Output;

// supports zod
interface InputValidator<Input> {
  parse: (rawInput: unknown) => Input,
}

/* SEE README TO UNDERSTAND THE FLOW BETWEEN THE FOLLOWING TYPES */

interface Procedure<Context> {
  /** @internal */
  middlewares: Middleware<any, any>[],
  use: <NewContext>(middleware: Middleware<Context, NewContext>) => Procedure<NewContext>,
  input: <NewInput>(inputValidator: InputValidator<NewInput>) => ProcedureWithInputValidator<Context, NewInput>,
  define: <NewInput, NewOutput>(resolver: Resolver<Context, NewInput, NewOutput>) => BuiltProcedure<Context, NewInput, NewOutput>,
}

interface ProcedureWithInputValidator<Context, Input> {
  /** @internal */
  middlewares: Middleware<any, any>[],
  /** @internal */
  inputValidator: InputValidator<Input>,
  use: <NewContext>(middleware: Middleware<Context, NewContext>) => ProcedureWithInputValidator<NewContext, Input>,
  define: <NewOutput>(resolver: Resolver<Context, Input, NewOutput>) => BuiltProcedure<Context, Input, NewOutput>,
}

export interface BuiltProcedure<Context, Input, Output> {
  /** @internal */
  middlewares: Middleware<any, any>[],
  /** @internal */
  inputValidator?: InputValidator<Input>,
  /** @internal */
  resolver: Resolver<Context, Input, Output>,
}

export const procedure: Procedure<undefined> = {
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

function addMiddleware_ProcedureEmpty<OldContext, NewContext>(
  { middlewares }: Procedure<OldContext>,
  middleware: Middleware<OldContext, NewContext>,
): Procedure<NewContext> {
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

function addInputValidator_ProcedureEmpty<Context, NewInput>(
  { middlewares }: Procedure<Context>,
  inputValidator: InputValidator<NewInput>,
): ProcedureWithInputValidator<Context, NewInput> {
  return {
    middlewares,
    inputValidator,
    use(middleware) {
      return addMiddleware_ProcedureWithInputValidator(this, middleware);
    },
    define(resolver) {
      return addResolver_ProcedureWithInputValidator(this, resolver);
    },
  };
}

function addResolver_ProcedureEmpty<Context, NewInput, NewOutput>(
  { middlewares }: Procedure<Context>,
  resolver: Resolver<Context, NewInput, NewOutput>,
): BuiltProcedure<Context, NewInput, NewOutput> {
  return {
    middlewares,
    resolver,
  };
}

function addMiddleware_ProcedureWithInputValidator<OldContext, Input, NewContext>(
  { middlewares, inputValidator }: ProcedureWithInputValidator<OldContext, Input>,
  middleware: Middleware<OldContext, NewContext>,
): ProcedureWithInputValidator<NewContext, Input> {
  return {
    middlewares: [...middlewares, middleware],
    inputValidator,
    use(middleware) {
      return addMiddleware_ProcedureWithInputValidator(this, middleware);
    },
    define(resolver) {
      return addResolver_ProcedureWithInputValidator(this, resolver);
    },
  };
}

function addResolver_ProcedureWithInputValidator<Context, Input, NewOutput>(
  { middlewares, inputValidator }: ProcedureWithInputValidator<Context, Input>,
  resolver: Resolver<Context, Input, NewOutput>,
): BuiltProcedure<Context, Input, NewOutput> {
  return {
    middlewares,
    inputValidator,
    resolver,
  };
}
