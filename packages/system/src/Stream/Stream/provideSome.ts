import * as T from "../../Effect"
import * as M from "../../Managed"
import { Stream } from "./definitions"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome_<R0, R, E, A>(self: Stream<R, E, A>, f: (r0: R0) => R) {
  return new Stream(M.map_(M.provideSome_(self.proc, f), T.provideSome(f)))
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSome<R0, R>(f: (r0: R0) => R) {
  return <E, A>(self: Stream<R, E, A>) => provideSome_(self, f)
}
