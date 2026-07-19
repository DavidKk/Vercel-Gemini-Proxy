/**
 * A type function that extracts the types of the values in a readonly array.
 *
 * @example
 * // Define a readonly array of specific strings
 * const array = ['a', 'b', 'c'] as const;
 *
 * // Use the type function
 * type Values = ValuesTypeOfArray<typeof array>;
 * // Values is now the type "a" | "b" | "c"
 *
 * @template T - The type of the readonly array
 */
// prettier-ignore
export type ValuesTypeOfArray<T extends readonly unknown[]> = T extends readonly [infer A, ...infer R]
  ? A extends string
    ? R extends readonly unknown[]
      ? A | ValuesTypeOfArray<R>
      : A
    : never
  : never
