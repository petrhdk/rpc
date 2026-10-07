/**
 * Hint:
 *  - See README.md to understand the conceptual design of the procedure builder.
 */

import type { MaybePromise } from './util.ts';
import { z } from 'zod';

// [types]: util types
// ---------------------------------------------------------
type Middleware<OldContext, NewContext> =
  (context: OldContext) => MaybePromise<NewContext>;

type Handler<FinalContext, Input, Output> =
  (input: Input, context: FinalContext) => MaybePromise<Output>;

interface InputSchema<Input> {
  parse: (rawInput: unknown) => Input, // based on `zod` schemas
}

// [types]: procedure stages
// ---------------------------------------------------------
interface ProcedureEmpty {
  needsInitialContext: <InitialContext>() => ProcedureWithInitialContext<InitialContext>,
  use: <FinalContext>(middleware: Middleware<unknown, FinalContext>) => ProcedureWithMiddleware<unknown, FinalContext>,
  input: <Input>(inputSchema: InputSchema<Input>) => ProcedureWithInputSchema<unknown, unknown, Input>,
  define: <Output>(handler: Handler<unknown, void, Output>) => Procedure<unknown, unknown, void, Output>,
};

interface ProcedureWithInitialContext<InitialContext> {
  use: <FinalContext>(middleware: Middleware<InitialContext, FinalContext>) => ProcedureWithMiddleware<InitialContext, FinalContext>,
  input: <Input>(inputSchema: InputSchema<Input>) => ProcedureWithInputSchema<InitialContext, InitialContext, Input>,
  define: <Output>(handler: Handler<InitialContext, void, Output>) => Procedure<InitialContext, InitialContext, void, Output>,
};

interface ProcedureWithMiddleware<InitialContext, FinalContext> {
  /** @internal */
  middlewares:
    | [Middleware<InitialContext, FinalContext>]
    | [Middleware<InitialContext, any>, ...Middleware<any, any>[], Middleware<any, FinalContext>],

  use: <NewFinalContext>(middleware: Middleware<FinalContext, NewFinalContext>) => ProcedureWithMiddleware<InitialContext, NewFinalContext>,
  input: <Input>(inputSchema: InputSchema<Input>) => ProcedureWithInputSchema<InitialContext, FinalContext, Input>,
  define: <Output>(handler: Handler<FinalContext, void, Output>) => Procedure<InitialContext, FinalContext, void, Output>,
};

interface ProcedureWithInputSchema<InitialContext, FinalContext, Input> {
  /** @internal */
  middlewares:
    | []
    | [Middleware<InitialContext, FinalContext>]
    | [Middleware<InitialContext, any>, ...Middleware<any, any>[], Middleware<any, FinalContext>],

  /** @internal */
  inputSchema: InputSchema<Input>,

  define: <Output>(handler: Handler<FinalContext, Input, Output>) => Procedure<InitialContext, FinalContext, Input, Output>,
};

export interface Procedure<InitialContext, FinalContext, Input, Output> {
  /** @internal */
  middlewares:
    | []
    | [Middleware<InitialContext, FinalContext>]
    | [Middleware<InitialContext, any>, ...Middleware<any, any>[], Middleware<any, FinalContext>],

  /** @internal */
  inputSchema: InputSchema<Input>,

  /** @internal */
  handler: Handler<FinalContext, Input, Output>,

  /**
   * [internal type discriminator]
   */
  $type?: 'Procedure', // this value is never actually assigned, but we declare it (as optional) in this type interface so that typescript will not interpret this interface as type `{}` after stripping all properties marked as `@internal` (as it happens when building the library .d.ts files) - because this would mean that in a user's application code ANY value passes the test `value extends Procedure`, which is not what we want.
};

// [implementation]: empty procedure (starting point)
// ---------------------------------------------------------
export const procedure: ProcedureEmpty = {
  needsInitialContext<InitialContext>() {
    return ProcedureEmpty_needsInitialContext<InitialContext>();
  },
  use(middleware) {
    return ProcedureEmpty_use(middleware);
  },
  input(inputSchema) {
    return ProcedureEmpty_input(inputSchema);
  },
  define(handler) {
    return ProcedureEmpty_define(handler);
  },
};

// [implementation]: stage transitions
// ---------------------------------------------------------
function ProcedureEmpty_needsInitialContext<InitialContext>(): ProcedureWithInitialContext<InitialContext> {
  return {
    use(middleware) {
      return ProcedureWithInitialContext_use(this, middleware);
    },
    input(inputSchema) {
      return ProcedureWithInitialContext_input(this, inputSchema);
    },
    define(handler) {
      return ProcedureWithInitialContext_define(this, handler);
    },
  };
}

function ProcedureEmpty_use<NewFinalContext>(
  middleware: Middleware<unknown, NewFinalContext>,
): ProcedureWithMiddleware<unknown, NewFinalContext> {
  return {
    middlewares: [middleware],

    use(middleware) {
      return ProcedureWithMiddleware_use(this, middleware);
    },
    input(inputSchema) {
      return ProcedureWithMiddleware_input(this, inputSchema);
    },
    define(handler) {
      return ProcedureWithMiddleware_define(this, handler);
    },
  };
}

function ProcedureEmpty_input<Input>(
  inputSchema: InputSchema<Input>,
): ProcedureWithInputSchema<unknown, unknown, Input> {
  return {
    middlewares: [],
    inputSchema,

    define(handler) {
      return ProcedureWithInputSchema_define(this, handler);
    },
  };
}

function ProcedureEmpty_define<Output>(
  handler: Handler<unknown, void, Output>,
): Procedure<unknown, unknown, void, Output> {
  return {
    middlewares: [],
    inputSchema: z.void(),
    handler,
  };
}

function ProcedureWithInitialContext_use<InitialContext, FinalContext>(
  _oldProcedure: ProcedureWithInitialContext<InitialContext>,
  middleware: Middleware<InitialContext, FinalContext>,
): ProcedureWithMiddleware<InitialContext, FinalContext> {
  return {
    middlewares: [middleware],
    use(middleware) {
      return ProcedureWithMiddleware_use(this, middleware);
    },
    input(inputSchema) {
      return ProcedureWithMiddleware_input(this, inputSchema);
    },
    define(handler) {
      return ProcedureWithMiddleware_define(this, handler);
    },
  };
}

function ProcedureWithInitialContext_input<InitialContext, Input>(
  _oldProcedure: ProcedureWithInitialContext<InitialContext>,
  inputSchema: InputSchema<Input>,
): ProcedureWithInputSchema<InitialContext, InitialContext, Input> {
  return {
    middlewares: [],
    inputSchema,
    define(handler) {
      return ProcedureWithInputSchema_define(this, handler);
    },
  };
}

function ProcedureWithInitialContext_define<InitialContext, Output>(
  _oldProcedure: ProcedureWithInitialContext<InitialContext>,
  handler: Handler<InitialContext, void, Output>,
): Procedure<InitialContext, InitialContext, void, Output> {
  return {
    middlewares: [],
    inputSchema: z.void(),
    handler,
  };
}

function ProcedureWithMiddleware_use<InitialContext, OldFinalContext, NewFinalContext>(
  oldProcedure: ProcedureWithMiddleware<InitialContext, OldFinalContext>,
  middleware: Middleware<OldFinalContext, NewFinalContext>,
): ProcedureWithMiddleware<InitialContext, NewFinalContext> {
  return {
    middlewares: [...oldProcedure.middlewares, middleware],

    use(middleware) {
      return ProcedureWithMiddleware_use(this, middleware);
    },
    input(inputSchema) {
      return ProcedureWithMiddleware_input(this, inputSchema);
    },
    define(handler) {
      return ProcedureWithMiddleware_define(this, handler);
    },
  };
}

function ProcedureWithMiddleware_input<InitialContext, FinalContext, Input>(
  oldProcedure: ProcedureWithMiddleware<InitialContext, FinalContext>,
  inputSchema: InputSchema<Input>,
): ProcedureWithInputSchema<InitialContext, FinalContext, Input> {
  return {
    middlewares: oldProcedure.middlewares,
    inputSchema,

    define(handler) {
      return ProcedureWithInputSchema_define(this, handler);
    },
  };
}

function ProcedureWithMiddleware_define<InitialContext, FinalContext, Output>(
  oldProcedure: ProcedureWithMiddleware<InitialContext, FinalContext>,
  handler: Handler<FinalContext, void, Output>,
): Procedure<InitialContext, FinalContext, void, Output> {
  return {
    middlewares: oldProcedure.middlewares,
    inputSchema: z.void(),
    handler,
  };
}

function ProcedureWithInputSchema_define<InitialContext, FinalContext, Input, Output>(
  oldProcedure: ProcedureWithInputSchema<InitialContext, FinalContext, Input>,
  handler: Handler<FinalContext, Input, Output>,
): Procedure<InitialContext, FinalContext, Input, Output> {
  return {
    middlewares: oldProcedure.middlewares,
    inputSchema: oldProcedure.inputSchema,
    handler,
  };
}
