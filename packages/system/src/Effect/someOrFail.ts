// tracing: off

import * as O from "../Option"
import { chain_, succeed, succeedWith } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @dataFirst someOrFail_
 */
export function someOrFail<E2>(orFail: () => E2, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, O.Option<A>>) => someOrFail_(self, orFail)
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, A, E2>(
  self: Effect<R, E, O.Option<A>>,
  orFail: () => E2,
  __trace?: string
): Effect<R, E | E2, A> {
  return chain_(
    self,
    O.fold(() => chain_(succeedWith(orFail), fail), succeed),
    __trace
  )
}
