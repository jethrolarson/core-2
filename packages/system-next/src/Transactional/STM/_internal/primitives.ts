import { _A, _E, _R } from "../../../Effect/definition/commons"
import * as E from "../../../Either"
import type { FiberId } from "../../../FiberId"
import type { LazyArg } from "../../../Function"
import type { Journal } from "../Journal/index"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const STMTypeId = Symbol.for("@effect-ts/system/STM")
export type STMTypeId = typeof STMTypeId

/**
 * `STM<R, E, A>` represents an effect that can be performed transactionally,
 *  resulting in a failure `E` or a value `A` that may require an environment
 *  `R` to execute.
 *
 * Software Transactional Memory is a technique which allows composition of
 * arbitrary atomic operations.  It is the software analog of transactions in
 * database systems.
 *
 * The API is lifted directly from the Haskell package Control.Concurrent.STM
 * although the implementation does not resemble the Haskell one at all.
 *
 * See http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html
 *
 * STM in Haskell was introduced in:
 *
 * Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton
 * Jones, and Maurice Herlihy, in ACM Conference on Principles and Practice of
 * Parallel Programming 2005.
 *
 * See https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/
 *
 * See also:
 *  Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim
 *  Harris, Simon Marlow, Simon Peyton Jones, Satnam Singh) FLOPS 2006: Eighth
 *  International Symposium on Functional and Logic Programming, Fuji Susono,
 *  JAPAN, April 2006
 *
 *  https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/
 *
 * The implemtation is based on the ZIO STM module, while JS environments have
 * no race conditions from multiple threads STM provides greater benefits for
 * synchronization of Fibers and transactional data-types can be quite useful.
 */
export abstract class STM<R, E, A> {
  readonly [STMTypeId]: STMTypeId = STMTypeId;
  readonly [_R]: (_: R) => void;
  readonly [_E]: () => E;
  readonly [_A]: () => A
}

export const STMEffectTypeId = Symbol.for("@effect-ts/system/STM/Effect")
export type STMEffectTypeId = typeof STMEffectTypeId

export class STMEffect<R, E, A> extends STM<R, E, A> {
  readonly _typeId: STMEffectTypeId = STMEffectTypeId
  constructor(readonly f: (journal: Journal, fiberId: FiberId, environment: R) => A) {
    super()
  }
}

export const STMOnFailureTypeId = Symbol.for("@effect-ts/system/STM/OnFailure")
export type STMOnFailureTypeId = typeof STMOnFailureTypeId

export class STMOnFailure<R, E, E1, A> extends STM<R, E1, A> {
  readonly _typeId: STMOnFailureTypeId = STMOnFailureTypeId
  constructor(readonly stm: STM<R, E, A>, readonly onFailure: (e: E) => STM<R, E1, A>) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a)
  }
}

export const STMOnRetryTypeId = Symbol.for("@effect-ts/system/STM/OnRetry")
export type STMOnRetryTypeId = typeof STMOnRetryTypeId

export class STMOnRetry<R, E, A> extends STM<R, E, A> {
  readonly _typeId: STMOnRetryTypeId = STMOnRetryTypeId
  constructor(readonly stm: STM<R, E, A>, readonly onRetry: STM<R, E, A>) {
    super()
  }
  apply(a: A): STM<R, E, A> {
    return new STMSucceedNow(a)
  }
}

export const STMOnSuccessTypeId = Symbol.for("@effect-ts/system/STM/OnSuccess")
export type STMOnSuccessTypeId = typeof STMOnSuccessTypeId

export class STMOnSuccess<R, E, A, B> extends STM<R, E, B> {
  readonly _typeId: STMOnSuccessTypeId = STMOnSuccessTypeId
  constructor(readonly stm: STM<R, E, A>, readonly apply: (a: A) => STM<R, E, B>) {
    super()
  }
}

export const STMProvideTypeId = Symbol.for("@effect-ts/system/STM/Provide")
export type STMProvideTypeId = typeof STMProvideTypeId

export class STMProvide<R0, R, E, A> extends STM<R, E, A> {
  readonly _typeId: STMProvideTypeId = STMProvideTypeId
  constructor(readonly stm: STM<R0, E, A>, readonly f: (r: R) => R0) {
    super()
  }
}

export const STMSucceedNowTypeId = Symbol.for("@effect-ts/system/STM/SucceedNow")
export type STMSucceedNowTypeId = typeof STMSucceedNowTypeId

export class STMSucceedNow<R, E, A> extends STM<R, E, A> {
  readonly _typeId: STMSucceedNowTypeId = STMSucceedNowTypeId
  constructor(readonly a: A) {
    super()
  }
}

export const STMSucceedTypeId = Symbol.for("@effect-ts/system/STM/Succeed")
export type STMSucceedTypeId = typeof STMSucceedTypeId

export class STMSucceed<R, E, A> extends STM<R, E, A> {
  readonly _typeId: STMSucceedTypeId = STMSucceedTypeId
  constructor(readonly a: () => A) {
    super()
  }
}

/**
 * @ets_optimize remove
 */

export function concreteSTM<R, E, A>(
  _: STM<R, E, A>
): asserts _ is
  | STMEffect<R, E, A>
  | STMOnFailure<R, unknown, E, A>
  | STMOnSuccess<R, E, unknown, A>
  | STMOnRetry<R, E, A>
  | STMSucceed<R, E, A>
  | STMSucceedNow<R, E, A>
  | STMProvide<unknown, R, E, A> {
  //
}

export const FailExceptionTypeId = Symbol.for("@effect-ts/system/STM/FailException")
export type FailExceptionTypeId = typeof FailExceptionTypeId

export class STMFailException<E> {
  readonly _typeId: FailExceptionTypeId = FailExceptionTypeId
  constructor(readonly e: E) {}
}

export function isFailException(u: unknown): u is STMFailException<unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_typeId" in u &&
    u["_typeId"] === FailExceptionTypeId
  )
}

export const DieExceptionTypeId = Symbol.for("@effect-ts/system/STM/DieException")
export type DieExceptionTypeId = typeof DieExceptionTypeId

export class STMDieException<E> {
  readonly _typeId: DieExceptionTypeId = DieExceptionTypeId
  constructor(readonly e: E) {}
}

export function isDieException(u: unknown): u is STMDieException<unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_typeId" in u &&
    u["_typeId"] === DieExceptionTypeId
  )
}

export const RetryExceptionTypeId = Symbol.for("@effect-ts/system/STM/RetryException")
export type RetryExceptionTypeId = typeof RetryExceptionTypeId

export class STMRetryException {
  readonly _typeId: RetryExceptionTypeId = RetryExceptionTypeId
}

export function isRetryException(u: unknown): u is STMRetryException {
  return (
    typeof u === "object" &&
    u != null &&
    "_typeId" in u &&
    u["_typeId"] === RetryExceptionTypeId
  )
}

// -----------------------------------------------------------------------------
// Primitive Operations
// -----------------------------------------------------------------------------

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export function succeedNow<A>(a: A): STM<unknown, never, A> {
  return new STMSucceedNow(a)
}

/**
 * Returns an `STM` effect that succeeds with the specified value.
 */
export function succeed<A>(a: LazyArg<A>): STM<unknown, never, A> {
  return new STMSucceed(a)
}

/**
 * Returns a value that models failure in the transaction.
 */
export function failNow<E>(e: E): STM<unknown, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e)
  })
}

/**
 * Returns a value that models failure in the transaction.
 */
export function fail<E>(e: LazyArg<E>): STM<unknown, E, never> {
  return new STMEffect(() => {
    throw new STMFailException(e())
  })
}

/**
 * Kills the fiber running the effect.
 */
export function die(u: unknown): STM<unknown, never, never> {
  return new STMEffect(() => {
    throw new STMDieException(u)
  })
}

/**
 * Kills the fiber running the effect.
 */
export function dieWith(u: () => unknown): STM<unknown, never, never> {
  return new STMEffect(() => {
    throw new STMDieException(u())
  })
}

/**
 * Maps the value produced by the effect.
 */
export function map_<R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, E, B> {
  return chain_(self, (a) => succeedNow(f(a)))
}

/**
 * Maps the value produced by the effect.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, E, B> {
  return (self) => map_(self, f)
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 */
export function chain_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R, E | E1, B> {
  return new STMOnSuccess<R1 & R, E | E1, A, B>(self, f)
}

/**
 * Feeds the value produced by this effect to the specified function,
 * and then runs the returned effect as well to produce its results.
 *
 * @ets_data_first chain_
 */
export function chain<A, R1, E1, B>(
  f: (a: A) => STM<R1, E1, B>
): <R, E>(self: STM<R, E, A>) => STM<R1 & R, E | E1, B> {
  return (self) => chain_(self, f)
}

/**
 * Recovers from all errors.
 */
export function catchAll_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (e: E) => STM<R1, E1, B>
): STM<R1 & R, E1, A | B> {
  return new STMOnFailure<R1 & R, E, E1, A | B>(self, f)
}

/**
 * Recovers from all errors.
 *
 * @ets_data_first catchAll_
 */
export function catchAll<E, R1, E1, B>(
  f: (e: E) => STM<R1, E1, B>
): <R, A>(self: STM<R, E, A>) => STM<R1 & R, E1, A | B> {
  return (self) => catchAll_(self, f)
}

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 */
export function foldSTM_<R, E, A, R1, E1, B, R2, E2, C>(
  self: STM<R, E, A>,
  g: (e: E) => STM<R2, E2, C>,
  f: (a: A) => STM<R1, E1, B>
): STM<R1 & R2 & R, E1 | E2, B | C> {
  return chain_<R2 & R, E2, E.Either<C, A>, R1, E1, B | C>(
    catchAll_(map_(self, E.right), (e) => map_(g(e), E.left)),
    E.fold(succeedNow, f)
  )
}

/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 *
 * @ets_data_first foldSTM_
 */
export function foldSTM<E, A, R1, E1, B, R2, E2, C>(
  g: (e: E) => STM<R2, E2, C>,
  f: (a: A) => STM<R1, E1, B>
): <R>(self: STM<R, E, A>) => STM<R1 & R2 & R, E1 | E2, B | C> {
  return (self) => foldSTM_(self, g, f)
}

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 */
export function ensuring_<R, E, A, R1, B>(
  self: STM<R, E, A>,
  finalizer: STM<R1, never, B>
): STM<R & R1, E, A> {
  return foldSTM_(
    self,
    (e) => chain_(finalizer, () => failNow(e)),
    (a) => chain_(finalizer, () => succeedNow(a))
  )
}

/**
 * Executes the specified finalization transaction whether or
 * not this effect succeeds. Note that as with all STM transactions,
 * if the full transaction fails, everything will be rolled back.
 *
 * @ets_data_first ensuring_
 */
export function ensuring<R1, B>(
  finalizer: STM<R1, never, B>
): <R, E, A>(self: STM<R, E, A>) => STM<R & R1, E, A> {
  return (self) => ensuring_(self, finalizer)
}

/**
 * Abort and retry the whole transaction when any of the underlying
 * transactional variables have changed.
 */
export const retry: STM<unknown, never, never> = new STMEffect(() => {
  throw new STMRetryException()
})

/**
 * Returns an `STM` effect that succeeds with `Unit`.
 */
export const unit = succeedNow<void>(undefined)

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export function provideSomeEnvironment_<R, E, A, R0>(
  self: STM<R, E, A>,
  f: (r: R0) => R
): STM<R0, E, A> {
  return new STMProvide(self, f)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 *
 * @ets_data_first provideSomeEnvironment_
 */
export function provideSomeEnvironment<R, R0>(
  f: (r: R0) => R
): <E, A>(self: STM<R, E, A>) => STM<R0, E, A> {
  return (self) => provideSomeEnvironment_(self, f)
}
