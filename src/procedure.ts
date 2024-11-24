type Middleware<ContextIn, ContextOut> = (context: ContextIn, rawInput: unknown) => Promise<ContextOut> | ContextOut;

type Resolver<Context, Input, Output> = (input: Input, context: Context) => Promise<Output> | Output;

/**
 * supports zod
 */
interface InputValidator<Input> {
  parse: (rawInput: unknown) => Input,
}

/* SEE README TO UNDERSTAND THE FLOW BETWEEN THE FOLLOWING TYPES */

interface ProcedureEmpty {
  use: <NewContext>(middleware: Middleware<undefined, NewContext>) => ProcedureWithContext<NewContext>,
  input: <Input>(inputValidator: InputValidator<Input>) => ProcedureWithInput<Input>,
  define: <Input, Output>(resolver: Resolver<undefined, Input, Output>) => ProcedureWithResolver<Input, Output>,
}

interface ProcedureWithContext<Context> {
  /** @internal */
  _middlewares: [...Middleware<any, any>[], Middleware<any, Context>],
  use: <NewContext>(middleware: Middleware<Context, NewContext>) => ProcedureWithContext<NewContext>,
  input: <Input>(inputValidator: InputValidator<Input>) => ProcedureWithContextAndInput<Context, Input>,
  define: <Input, Output>(resolver: Resolver<Context, Input, Output>) => ProcedureWithContextAndResolver<Context, Input, Output>,
}

interface ProcedureWithContextAndInput<Context, Input> {
  /** @internal */
  _middlewares: [...Middleware<any, any>[], Middleware<any, Context>],
  /** @internal */
  _inputValidator: InputValidator<Input>,
  define: <Output>(resolver: Resolver<Context, Input, Output>) => ProcedureWithContextAndInputAndResolver<Context, Input, Output>,
}

interface ProcedureWithContextAndInputAndResolver<Context, Input, Output> {
  /** @internal */
  _middlewares: [...Middleware<any, any>[], Middleware<any, Context>],
  /** @internal */
  _inputValidator: InputValidator<Input>,
  /** @internal */
  _resolver: Resolver<Context, Input, Output>,
}

interface ProcedureWithContextAndResolver<Context, Input, Output> {
  /** @internal */
  _middlewares: [...Middleware<any, any>[], Middleware<any, Context>],
  /** @internal */
  _resolver: Resolver<Context, Input, Output>,
}

interface ProcedureWithInput<Input> {
  /** @internal */
  _inputValidator: InputValidator<Input>,
  define: <Output>(resolver: Resolver<undefined, Input, Output>) => ProcedureWithInputAndResolver<Input, Output>,
}

interface ProcedureWithInputAndResolver<Input, Output> {
  /** @internal */
  _inputValidator: InputValidator<Input>,
  /** @internal */
  _resolver: Resolver<undefined, Input, Output>,
}

interface ProcedureWithResolver<Input, Output> {
  /** @internal */
  _resolver: Resolver<undefined, Input, Output>,
}

export type BuiltProcedure<Context, Input, Output> =
  ProcedureWithContextAndInputAndResolver<Context, Input, Output>
  | ProcedureWithContextAndResolver<Context, Input, Output>
  | ProcedureWithInputAndResolver<Input, Output>
  | ProcedureWithResolver<Input, Output>;

export const procedure: ProcedureEmpty = {
  use(middleware) {
    return create_ProcedureWithContext_from_ProcedureEmpty(middleware);
  },
  input(inputValidator) {
    return create_ProcedureWithInput_from_ProcedureEmpty(inputValidator);
  },
  define(resolver) {
    return create_ProcedureWithResolver_from_ProcedureEmpty(resolver);
  },
};

function create_ProcedureWithContext_from_ProcedureEmpty<NewContext>(
  middleware: Middleware<undefined, NewContext>,
): ProcedureWithContext<NewContext> {
  return {
    _middlewares: [middleware],
    use(middleware) {
      return create_ProcedureWithContext_from_ProcedureWithContext(this, middleware);
    },
    input(inputValidator) {
      return create_ProcedureWithContextAndInput_from_ProcedureWithContext(this, inputValidator);
    },
    define(resolver) {
      return create_ProcedureWithContextAndResolver_from_ProcedureWithContext(this, resolver);
    },
  };
}

function create_ProcedureWithContext_from_ProcedureWithContext<OldContext, NewContext>(
  oldProcedure: ProcedureWithContext<OldContext>,
  middleware: Middleware<OldContext, NewContext>,
): ProcedureWithContext<NewContext> {
  return {
    _middlewares: [...oldProcedure._middlewares, middleware],
    use(middleware) {
      return create_ProcedureWithContext_from_ProcedureWithContext(this, middleware);
    },
    input(inputValidator) {
      return create_ProcedureWithContextAndInput_from_ProcedureWithContext(this, inputValidator);
    },
    define(resolver) {
      return create_ProcedureWithContextAndResolver_from_ProcedureWithContext(this, resolver);
    },
  };
}

function create_ProcedureWithContextAndInput_from_ProcedureWithContext<Context, Input>(
  { _middlewares }: ProcedureWithContext<Context>,
  inputValidator: InputValidator<Input>,
): ProcedureWithContextAndInput<Context, Input> {
  return {
    _middlewares,
    _inputValidator: inputValidator,
    define(resolver) {
      return create_ProcedureWithContextAndInputAndResolver_from_ProcedureWithContextAndInput(this, resolver);
    },
  };
}

function create_ProcedureWithContextAndInputAndResolver_from_ProcedureWithContextAndInput<Context, Input, Output>(
  { _middlewares, _inputValidator }: ProcedureWithContextAndInput<Context, Input>,
  resolver: Resolver<Context, Input, Output>,
): ProcedureWithContextAndInputAndResolver<Context, Input, Output> {
  return {
    _middlewares,
    _inputValidator,
    _resolver: resolver,
  };
}

function create_ProcedureWithContextAndResolver_from_ProcedureWithContext<Context, Input, Output>(
  { _middlewares }: ProcedureWithContext<Context>,
  resolver: Resolver<Context, Input, Output>,
): ProcedureWithContextAndResolver<Context, Input, Output> {
  return {
    _middlewares,
    _resolver: resolver,
  };
}

function create_ProcedureWithInput_from_ProcedureEmpty<Input>(
  inputValidator: InputValidator<Input>,
): ProcedureWithInput<Input> {
  return {
    _inputValidator: inputValidator,
    define(resolver) {
      return create_ProcedureWithInputAndResolver_from_ProcedureWithInput(this, resolver);
    },
  };
}

function create_ProcedureWithInputAndResolver_from_ProcedureWithInput<Input, Output>(
  oldProcedure: ProcedureWithInput<Input>,
  resolver: Resolver<undefined, Input, Output>,
) {
  return {
    _inputValidator: oldProcedure._inputValidator,
    _resolver: resolver,
  };
}

function create_ProcedureWithResolver_from_ProcedureEmpty<Input, Output>(
  resolver: Resolver<undefined, Input, Output>,
): ProcedureWithResolver<Input, Output> {
  return {
    _resolver: resolver,
  };
}
