// prettier-ignore
export type ValuesTypeOfArray<T extends readonly unknown[]> = T extends readonly [infer A, ...infer R]
  ? A extends string
    ? R extends readonly unknown[]
      ? A | ValuesTypeOfArray<R>
      : A
    : never
  : never
