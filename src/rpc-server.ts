import { isDefined } from '@petrhdk/util';
import { z } from 'zod';
import { type newProcedureBuilder, procedure } from './rpc-procedure';

interface RecursiveDictionary<TLeave> {
  [key: string]: TLeave | RecursiveDictionary<TLeave>,
}

const a = procedure
  .use(() => ({ abc: 123 }))
  .use((context) => ({ ...context, xyz: 123 }))
  .input(() => 'hello')
  .define((input, context) => {
    console.log({ context, input });
  })
  ;

export function createRpcServer<
  D extends RecursiveDictionary<ReturnType<typeof newProcedureBuilder>>,
>(
  procedures: D,
) {
  return {
    invoke(keyPath: string[], rawInput: unknown) {
      // find procedure
      let target: any = procedures;
      while (keyPath.length) {
        target = target[keyPath.shift()!];
      }
      const procedure = target as ReturnType<typeof newProcedureBuilder>;

      // run middleware
      let context;
      for (const middleware of procedure._def.middlewares) {
        context = middleware(context, rawInput); // may throw exception
      }

      // parse input
      const parsedInput = isDefined(procedure._def.inputValidator)
        ? procedure._def.inputValidator(rawInput) // may throw exception
        : rawInput;

      // invoke
      procedure._def.handler?.(parsedInput, context);
    },
  };
}

const server = createRpcServer({
  call: {
    me: {
      maybe: a,
      yeah: procedure,
    },
  },
});
