interface MiddlewareFunction<TContextIn, TContextOut> {
  (context: TContextIn, rawInput: unknown): TContextOut, // TODO: promisify
}

/**
 * supports zod
 */
interface InputValidator<TParsedInput> {
  parse: (rawInput: unknown) => TParsedInput,
}

// TODO: lots of "any" types can be improved by step-wise construction: first .use() then .input() then .define()
export function newProcedureBuilder<TContext, TParsedInput, TOutput>(_def: {
  middlewares: MiddlewareFunction<any, any>[],
  inputValidator?: InputValidator<TParsedInput>,
  handler?: (input: any, context: any) => TOutput,
}) {
  return {

    /**
     * @internal
     */
    _def,

    use<$NewTContext>(middleware: MiddlewareFunction<TContext, $NewTContext>) {
      const { middlewares, inputValidator, handler } = this._def;
      return newProcedureBuilder<$NewTContext, TParsedInput, TOutput>({
        middlewares: [...middlewares, middleware],
        inputValidator,
        handler,
      });
    },

    input<$NewTParsedInput>(inputValidator: InputValidator<$NewTParsedInput>) {
      const { middlewares, handler } = this._def;
      return newProcedureBuilder<TContext, $NewTParsedInput, TOutput>({
        middlewares: [...middlewares], // TODO: probably doesn't need destructuring // TODO: can be fixed with step-wise types where .use() is only allowed before .define()
        inputValidator,
        handler,
      });
    },

    define<$NewTOutput>(handler: (input: TParsedInput, context: TContext) => $NewTOutput) {
      const { middlewares, inputValidator } = this._def;
      return newProcedureBuilder<TContext, TParsedInput, $NewTOutput>({
        middlewares: [...middlewares], // TODO: probably doesn't need destructuring
        inputValidator,
        handler,
      });
    },
  };
}

export const procedure = newProcedureBuilder({
  middlewares: [],
  inputValidator: undefined,
  handler: undefined,
});
