import { z } from 'zod';
import { procedure, type ProcedureBuilder } from './rpc-procedure';

interface RecursiveDictionary<TLeave> {
  [key: string]: TLeave | RecursiveDictionary<TLeave>,
}

const a = procedure
  .use(() => ({ abc: 123 }))
  .use((context) => ({ ...context, xyz: 123 }))
  .input(() => 'hello')
  // .define(({ context, input }) => {
  //   console.log({ context, input });
  // })
  ;

export function createRpcServer<P extends ProcedureBuilder<any, any, any, true>>(procedures: RecursiveDictionary<P>) {
}

const server = createRpcServer({
  call: {
    me: {
      maybe: a,
    },
  },
});

// type OBJ<T> = {
//   abc: T,
// }

// const obj: OBJ<true> = {};

// function getObj(): OBJ<unknown> {
//   return {
//     abc: undefined,
//   }
// }
