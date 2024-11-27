type Middleware<ContextIn, ContextOut> = (context: ContextIn, rawInput: unknown) => Promise<ContextOut> | ContextOut;

type Resolver<Context, Input, Output> = (input: Input, context: Context) => Promise<Output> | Output;

// supports zod
interface InputValidator<Input> {
  parse: (rawInput: unknown) => Input,
}

/* SEE README TO UNDERSTAND THE FLOW BETWEEN THE FOLLOWING TYPES */

interface Procedure<Context> {
  /** @internal */
  _middlewares: Middleware<any, any>[],
  use: <NewContext>(middleware: Middleware<Context, NewContext>) => Procedure<NewContext>,
  input: <NewInput>(inputValidator: InputValidator<NewInput>) => ProcedureWithInputValidator<Context, NewInput>,
  define: <NewInput, NewOutput>(resolver: Resolver<Context, NewInput, NewOutput>) => BuiltProcedure<Context, NewInput, NewOutput>,
}

interface ProcedureWithInputValidator<Context, Input> {
  /** @internal */
  _middlewares: Middleware<any, any>[],
  /** @internal */
  _inputValidator: InputValidator<Input>,
  use: <NewContext>(middleware: Middleware<Context, NewContext>) => ProcedureWithInputValidator<NewContext, Input>,
  define: <NewOutput>(resolver: Resolver<Context, Input, NewOutput>) => BuiltProcedure<Context, Input, NewOutput>,
}

export interface BuiltProcedure<Context, Input, Output> {
  /** @internal */
  _middlewares: Middleware<any, any>[],
  /** @internal */
  _inputValidator?: InputValidator<Input>,
  /** @internal */
  _resolver: Resolver<Context, Input, Output>,
}

export const procedure: Procedure<undefined> = {
  _middlewares: [],
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
  { _middlewares }: Procedure<OldContext>,
  middleware: Middleware<OldContext, NewContext>,
): Procedure<NewContext> {
  return {
    _middlewares: [..._middlewares, middleware],
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
  { _middlewares }: Procedure<Context>,
  inputValidator: InputValidator<NewInput>,
): ProcedureWithInputValidator<Context, NewInput> {
  return {
    _middlewares,
    _inputValidator: inputValidator,
    use(middleware) {
      return addMiddleware_ProcedureWithInputValidator(this, middleware);
    },
    define(resolver) {
      return addResolver_ProcedureWithInputValidator(this, resolver);
    },
  };
}

function addResolver_ProcedureEmpty<Context, NewInput, NewOutput>(
  { _middlewares }: Procedure<Context>,
  resolver: Resolver<Context, NewInput, NewOutput>,
): BuiltProcedure<Context, NewInput, NewOutput> {
  return {
    _middlewares,
    _resolver: resolver,
  };
}

function addMiddleware_ProcedureWithInputValidator<OldContext, Input, NewContext>(
  { _middlewares, _inputValidator }: ProcedureWithInputValidator<OldContext, Input>,
  middleware: Middleware<OldContext, NewContext>,
): ProcedureWithInputValidator<NewContext, Input> {
  return {
    _middlewares: [..._middlewares, middleware],
    _inputValidator,
    use(middleware) {
      return addMiddleware_ProcedureWithInputValidator(this, middleware);
    },
    define(resolver) {
      return addResolver_ProcedureWithInputValidator(this, resolver);
    },
  };
}

function addResolver_ProcedureWithInputValidator<Context, Input, NewOutput>(
  { _middlewares, _inputValidator }: ProcedureWithInputValidator<Context, Input>,
  resolver: Resolver<Context, Input, NewOutput>,
): BuiltProcedure<Context, Input, NewOutput> {
  return {
    _middlewares,
    _inputValidator,
    _resolver: resolver,
  };
}
