import { expectType } from 'tsd-lite'
import type { ValuesTypeOfArray } from '@/types/utils'

describe('types/utils', () => {
  describe('test ValuesTypeOfArray', () => {
    const array = ['a', 'b', 'c'] as const
    type Values = ValuesTypeOfArray<typeof array>
    expectType<Values>(((): 'a' | 'b' | 'c' => 'a')())
  })
})
