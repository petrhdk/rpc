type Middleware<ContextIn, ContextOut> = (context: ContextIn, rawInput: unknown) => Promise<ContextOut> | ContextOut;

type Resolver<Input, Context, Output> = (input: Input, context: Context) => Promise<Output> | Output;

/**
 * supports zod
 */
interface InputValidator<TParsedInput> {
  parse: (rawInput: unknown) => TParsedInput,
}

export interface Procedure<ContextDefined extends boolean, Context, InputDefined extends boolean, Input, Defined extends boolean, Output> {
  /** @internal */
  _middlewares: ContextDefined extends true ? [...Middleware<any, any>[], Middleware<any, Context>] : undefined,

  /** @internal */
  _inputValidator: InputDefined extends true ? InputValidator<Input> : undefined,

  /** @internal */
  _resolver: Defined extends true ? Resolver<any, any, Output> : undefined,

  use: <NewContext>(middleware: Middleware<Context, NewContext>) => Procedure<true, NewContext, InputDefined, Input, Defined, Output>,

  input: <NewInput>(inputValidator: InputValidator<NewInput>) => Procedure<ContextDefined, Context, true, NewInput, Defined, Output>,

  define: <NewOutput>(resolver: Resolver<Input, Context, NewOutput>) => Procedure<ContextDefined, Context, InputDefined, Input, true, NewOutput>,
}

export function newProcedure<ContextDefined extends boolean, Context, InputDefined extends boolean, Input, Defined extends boolean, Output>(
  middlewares: ContextDefined extends true ? [...any[], Middleware<any, Context>] : undefined,
  inputValidator: InputDefined extends true ? InputValidator<Input> : undefined,
  resolver: Defined extends true ? (Resolver<Input, Context, Output>) : undefined,
): Procedure<ContextDefined, Context, InputDefined, Input, Defined, Output> {
  return {

    /** @internal */
    _middlewares: middlewares,

    /** @internal */
    _inputValidator: inputValidator,

    /** @internal */
    _resolver: resolver,

    use(middleware) {
      return newProcedure(
        [...(this._middlewares ?? []), middleware],
        this._inputValidator,
        this._resolver,
      );
    },

    input(inputValidator) {
      return newProcedure(
        this._middlewares,
        inputValidator,
        this._resolver,
      );
    },

    define(resolver) {
      return newProcedure(
        this._middlewares,
        this._inputValidator,
        resolver,
      );
    },
  };
}

export const procedure = newProcedure(undefined, undefined, undefined);
