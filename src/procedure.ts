interface MiddlewareFunction<TContextIn, TContextOut> {
  (context: TContextIn, rawInput: unknown): TContextOut, // TODO: promisify
}

/**
 * supports zod
 */
interface InputValidator<TParsedInput> {
  parse: (rawInput: unknown) => TParsedInput,
}

export interface Procedure<ContextDefined extends boolean, Context, InputDefined extends boolean, Input, Defined extends boolean, Output> {
  /** @internal */
  _middlewares: ContextDefined extends true ? [...any[], MiddlewareFunction<any, Context>] : undefined,

  /** @internal */
  _inputValidator: InputDefined extends true ? InputValidator<Input> : undefined,

  /** @internal */
  _resolver: Defined extends true ? ((input: any, context: any) => Output) : undefined,

  use: <NewContext>(middleware: MiddlewareFunction<Context, NewContext>) => Procedure<true, NewContext, InputDefined, Input, Defined, Output>,

  input: <NewInput>(inputValidator: InputValidator<NewInput>) => Procedure<ContextDefined, Context, true, NewInput, Defined, Output>,

  define: <NewOutput>(resolver: (input: Input, context: Context) => NewOutput) => Procedure<ContextDefined, Context, InputDefined, Input, true, NewOutput>,
}

export function newProcedure<ContextDefined extends boolean, Context, InputDefined extends boolean, Input, Defined extends boolean, Output>(
  middlewares: ContextDefined extends true ? [...any[], MiddlewareFunction<any, Context>] : undefined,
  inputValidator: InputDefined extends true ? InputValidator<Input> : undefined,
  resolver: Defined extends true ? ((input: any, context: any) => Output) : undefined,
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
