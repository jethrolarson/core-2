import type { Atomic } from "../Atomic"

export function unsafeUpdate_<A>(self: Atomic<A>, f: (a: A) => A): void {
  self.value = f(self.value)
}

/**
 * @ets_data_first unsafeUpdate_
 */
export function unsafeUpdate<A>(f: (a: A) => A) {
  return (self: Atomic<A>): void => unsafeUpdate_(self, f)
}
