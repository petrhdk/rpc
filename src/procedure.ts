import type { MaybePromise } from './util.ts';

type Middleware<ServerContext, Context, NewContext> =
  (serverContext: ServerContext, context: Context,) => MaybePromise<NewContext>;

type Resolver<Context, Input, Output> =
  (input: Input, context: Context) => MaybePromise<Output>;

// based on `zod`
interface InputValidator<Input> {
  parse: (rawInput: unknown) => Input,
}

interface ProcedureUndefined<
  ServerContext,
  Context,
  Input,
> {
  /** @internal */
  middlewares: Middleware<ServerContext, any, any>[],
  /** @internal */
  inputValidator?: InputValidator<Input>,

  use: <NewContext>(middleware: Middleware<ServerContext, Context, NewContext>) => ProcedureUndefined<ServerContext, NewContext, Input>,
  input: <NewInput>(inputValidator: InputValidator<NewInput>) => ProcedureUndefined<ServerContext, Context, NewInput>,
  define: <NewOutput>(resolver: Resolver<Context, Input, NewOutput>) => Procedure<ServerContext, Context, Input, NewOutput>,
}

export interface Procedure<ServerContext, Context, Input, Output>
  extends Omit<ProcedureUndefined<ServerContext, Context, Input>, 'use' | 'input' | 'define'> {

  /** @internal */
  resolver: Resolver<Context, Input, Output>,
}

export function procedure<ServerContext = undefined>(): ProcedureUndefined<ServerContext, undefined, undefined> {
  return {
    middlewares: [],
    use(middleware) {
      return addMiddleware(this, middleware);
    },
    input(inputValidator) {
      return addInputValidator(this, inputValidator);
    },
    define(resolver) {
      return addResolver(this, resolver);
    },
  };
}

function addMiddleware<ServerContext, OldContext, $NewContext, Input>(
  oldProcedure: ProcedureUndefined<ServerContext, OldContext, Input>,
  middleware: Middleware<ServerContext, OldContext, $NewContext>,
): ProcedureUndefined<ServerContext, $NewContext, Input> {
  return {
    ...oldProcedure,
    middlewares: [...oldProcedure.middlewares, middleware],
  } as unknown as ProcedureUndefined<ServerContext, $NewContext, Input>;
}

function addInputValidator<ServerContext, Context, NewInput>(
  oldProcedure: ProcedureUndefined<ServerContext, Context, any>,
  inputValidator: InputValidator<NewInput>,
): ProcedureUndefined<ServerContext, Context, NewInput> {
  return {
    ...oldProcedure,
    inputValidator,
  };
}

function addResolver<ServerContext, Context, Input, Output>(
  oldProcedure: ProcedureUndefined<ServerContext, Context, Input>,
  resolver: Resolver<Context, Input, Output>,
): Procedure<ServerContext, Context, Input, Output> {
  return {
    middlewares: oldProcedure.middlewares,
    inputValidator: oldProcedure.inputValidator,
    resolver,
  };
}
