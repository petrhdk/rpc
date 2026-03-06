import type { MaybePromise } from './util.ts';
import { z } from 'zod';

type Middleware<ServerContext, Context, NewContext> =
  (context: Context, serverContext: ServerContext) => MaybePromise<NewContext>;

type Handler<ServerContext, Context, Input, Output> =
  (input: Input, context: Context, serverContext: ServerContext) => MaybePromise<Output>;

// based on `zod`
interface InputValidator<Input> {
  parse: (rawInput: unknown) => Input,
}

interface ProcedureEmpty<
  ServerContext,
  Context,
  Input,
> {
  /** @internal */
  middlewares: Middleware<ServerContext, any, any>[],
  /** @internal */
  inputValidator: InputValidator<Input>,

  use: <NewContext>(middleware: Middleware<ServerContext, Context, NewContext>) => ProcedureEmpty<ServerContext, NewContext, Input>,
  input: <NewInput>(inputValidator: InputValidator<NewInput>) => ProcedureEmpty<ServerContext, Context, NewInput>,
  define: <NewOutput>(handler: Handler<ServerContext, Context, Input, NewOutput>) => Procedure<ServerContext, Context, Input, NewOutput>,
}

export interface Procedure<ServerContext, Context, Input, Output>
  extends Omit<ProcedureEmpty<ServerContext, Context, Input>, 'use' | 'input' | 'define'> {

  /** @internal */
  handler: Handler<ServerContext, Context, Input, Output>,

  /**
   * [internal type identifier] — not a property that will actually be assigned any value to
   */
  $type?: 'Procedure', // this is necessary to differentiate this type from other types with the same signature, `{}`, which this interface has after stripping the properties marked with @internal, as is happens when typescript generates the .d.ts type declarations. so, without this identifier, any value would pass the test `value extends Procedure` in a user's application code, which is not what we want.
}

export function procedure<ServerContext = undefined>(): ProcedureEmpty<ServerContext, undefined, void> {
  return {
    middlewares: [],
    inputValidator: z.void(),
    use(middleware) {
      return addMiddleware(this, middleware);
    },
    input(inputValidator) {
      return addInputValidator(this, inputValidator);
    },
    define(handler) {
      return addHandler(this, handler);
    },
  };
}

function addMiddleware<ServerContext, OldContext, NewContext, Input>(
  oldProcedure: ProcedureEmpty<ServerContext, OldContext, Input>,
  middleware: Middleware<ServerContext, OldContext, NewContext>,
): ProcedureEmpty<ServerContext, NewContext, Input> {
  return {
    ...oldProcedure,
    middlewares: [...oldProcedure.middlewares, middleware],
  } as unknown as ProcedureEmpty<ServerContext, NewContext, Input>;
}

function addInputValidator<ServerContext, Context, NewInput>(
  oldProcedure: ProcedureEmpty<ServerContext, Context, any>,
  inputValidator: InputValidator<NewInput>,
): ProcedureEmpty<ServerContext, Context, NewInput> {
  return {
    ...oldProcedure,
    inputValidator,
  };
}

function addHandler<ServerContext, Context, Input, Output>(
  oldProcedure: ProcedureEmpty<ServerContext, Context, Input>,
  handler: Handler<ServerContext, Context, Input, Output>,
): Procedure<ServerContext, Context, Input, Output> {
  return {
    middlewares: oldProcedure.middlewares,
    inputValidator: oldProcedure.inputValidator,
    handler,
  };
}
