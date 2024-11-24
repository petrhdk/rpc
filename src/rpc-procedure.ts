interface MiddlewareFunction<TContextIn, TParsedInput, TContextOut> {
  (context: TContextIn, input: TParsedInput): TContextOut, // TODO: promisify
}

interface ProcedureBuilderDef<
  TContext,
  TParsedInput,
  TOutput,
> {
  middlewares: MiddlewareFunction<any, TParsedInput, any>[],
  inputValidator?: (input: unknown) => TParsedInput,
  handler?: (meta: { input: TParsedInput, context: TContext }) => TOutput,
}

export interface ProcedureBuilder<
  TContext,
  TParsedInput,
  TOutput,
> {
  /**
   * @internal
   */
  _def: ProcedureBuilderDef<TContext, TParsedInput, TOutput>,

  use: <$TContextOut>(
    middleware: MiddlewareFunction<TContext, TParsedInput, $TContextOut>
  ) => ProcedureBuilder<$TContextOut, TParsedInput, TOutput>,

  input: <$NewTParsedInput>(
    inputValidator: () => $NewTParsedInput
  ) => ProcedureBuilder<TContext, $NewTParsedInput, TOutput>,

  define: <$NewTOutput>(
    handler: (meta: { input: TParsedInput, context: TContext }) => $NewTOutput
  ) => ProcedureBuilder<TContext, TParsedInput, $NewTOutput>,
};

function newProcedureBuilder(_def: ProcedureBuilderDef<any, any, any>) {
  const builder: ProcedureBuilder<any, any, any> = {
    _def,

    use(middleware) {
      const { middlewares, inputValidator, handler } = this._def;
      return newProcedureBuilder({
        middlewares: [...middlewares, middleware],
        inputValidator,
        handler,
      });
    },

    input(inputValidator) {
      const { middlewares, handler } = this._def;
      return newProcedureBuilder({
        middlewares: [...middlewares], // TODO: probably doesn't need destructuring
        inputValidator,
        handler,
      });
    },

    define(handler) {
      const { middlewares, inputValidator } = this._def;
      return newProcedureBuilder({
        middlewares: [...middlewares], // TODO: probably doesn't need destructuring
        inputValidator,
        handler,
      });
    },
  };
  return builder;
}

/**
 * usage example:
 *
 * ```ts
 * const a = procedure
 *   .use(() => ({ abc: 123 }))
 *   .use((context) => ({ ...context, xyz: 123 }))
 *   .input(() => 'hello')
 *   .define(({ context, input }) => {
 *     console.log({ context, input });
 *   });
 * ```
 */
export const procedure = newProcedureBuilder({
  middlewares: [],
  inputValidator: undefined,
  handler: undefined,
});
