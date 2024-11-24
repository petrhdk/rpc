interface MiddlewareFunction<TContextIn, TParsedInput, TContextOut> {
  (context: TContextIn, input: TParsedInput): TContextOut, // TODO: promisify
}

type Handler<TParsedInput, TContext, TOutput> = (meta: { input: TParsedInput, context: TContext }) => TOutput;

interface ProcedureBuilderDef<
  TContext,
  TParsedInput,
  TOutput,
  Built,
> {
  middlewares: MiddlewareFunction<any, TParsedInput, any>[],
  inputValidator?: (input: unknown) => TParsedInput,
  handler:
  Built extends true
    ? Handler<TParsedInput, TContext, TOutput>
    : Built extends false
      ? undefined
      : never,
}

export interface ProcedureBuilder<
  TContext,
  TParsedInput,
  TOutput,
  Built = false,
> {
  /**
   * @internal
   */
  _def: ProcedureBuilderDef<
    TContext,
    TParsedInput,
    TOutput,
    Built
  >,

  use: <$TContextOut>(
    middleware: MiddlewareFunction<TContext, TParsedInput, $TContextOut>
  ) => ProcedureBuilder<$TContextOut, TParsedInput, TOutput, Built>,

  input: <$NewTParsedInput>(
    inputValidator: () => $NewTParsedInput
  ) => ProcedureBuilder<TContext, $NewTParsedInput, TOutput, Built>,

  define: <$NewTOutput>(
    handler: (meta: { input: TParsedInput, context: TContext }) => $NewTOutput
  ) => ProcedureBuilder<TContext, TParsedInput, $NewTOutput, true>,
};

function newProcedureBuilder<T1, T2, T3, T4 extends boolean>(_def: ProcedureBuilderDef<any, any, any, T4>) {
  const builder: ProcedureBuilder<T1, T2, T3, T4> = {
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

// export type Procedure<$ProcedureBuilder> =
//   $ProcedureBuilder extends ProcedureBuilder<infer $TContext, infer $TParsedInput, infer $TOutput>
//   ?
//   : never;

// export type Procedure<P> =
//   P extends ProcedureBuilder<infer $TContext, infer $TParsedInput, infer $TOutput>
//     ? unknown extends $TContext
//       ? never
//       : unknown extends $TParsedInput
//         ? never
//         : unknown extends $TOutput
//           ? never
//           : P
//     : never;

// export type Procedure<P> =
//   P extends ProcedureBuilder<infer $TContext, infer $TParsedInput, infer $TOutput>
//     ? any extends $TContext
//       ? never
//       : any extends $TParsedInput
//         ? never
//         : any extends $TOutput
//           ? never
//           : P
//     : never;

// export type Procedure<TContext, TParsedInput, TOutput> =
//   TContext extends undefined
//     ? never
//     : TParsedInput extends undefined
//       ? never
//       : TOutput extends undefined
//         ? never
//         : ProcedureBuilder<TContext, TParsedInput, TOutput>;

// export type Procedure<P> = P extends ProcedureBuilder<infer $TContext, infer $TParsedInput, infer $TOutput>
//   ? undefined extends $TContext
//     ? never
//     : undefined extends $TParsedInput
//       ? never
//       : undefined extends $TOutput
//         ? never
//         : P
//   : never;
