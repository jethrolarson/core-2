import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { succeed } from "./succeed"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 */
export function exists_<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __trace?: string
): Effect<R, E, boolean> {
  return chain_(succeed(as[Symbol.iterator]), (iterator) => loop(iterator, f, __trace))
}

/**
 * Determines whether any element of the `Iterable<A>` satisfies the effectual
 * predicate `f`.
 *
 * @ets_data_first exists_
 */
export function exists<R, E, A>(f: (a: A) => Effect<R, E, boolean>, __trace?: string) {
  return (as: Iterable<A>): Effect<R, E, boolean> => exists_(as, f, __trace)
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __trace?: string
): Effect<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return succeedNow(false)
  }
  return chain_(f(next.value), (b) =>
    b ? succeedNow(b) : suspendSucceed(() => loop(iterator, f, __trace))
  )
}
