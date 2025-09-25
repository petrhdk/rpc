export type MaybePromise<T> = Promise<T> | T;

/**
 * Wraps the return type of any given function type in Promise<> if it is not already a Promise
 */
export type Promisify<$T> = $T extends Promise<any>
  ? $T
  : Promise<$T>;

export interface RecursiveDictionary<TLeaf> {
  [key: string]: TLeaf | RecursiveDictionary<TLeaf>,
}
