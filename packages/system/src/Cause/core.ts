// tracing: off

/* eslint-disable prefer-const */
import * as A from "../Collections/Immutable/Array"
import * as E from "../Either"
import type { Trace } from "../Fiber"
import type { FiberID } from "../Fiber/id"
import { identity, pipe } from "../Function"
import * as S from "../IO"
import * as O from "../Option"
import { Stack } from "../Stack"
import type { Cause } from "./cause"
import { both, die, empty, fail, then, traced } from "./cause"
import { equalsCause } from "./eq"
import { InterruptedException } from "./errors"

export { both, Cause, die, empty, fail, interrupt, then, traced } from "./cause"

/**
 * Applicative's ap
 */
export function ap<A>(fa: Cause<A>): <B>(fab: Cause<(a: A) => B>) => Cause<B> {
  return chain((f) => pipe(fa, map(f)))
}

/**
 * Substitute the E in the cause
 */
export function as<E1>(e: E1) {
  return map(() => e)
}

/**
 * Builds a Cause depending on the result of another
 */
export function chain_<E, E1>(cause: Cause<E>, f: (_: E) => Cause<E1>): Cause<E1> {
  return S.run(chainSafe_(cause, f))
}

/**
 * Builds a Cause depending on the result of another
 */
export function chain<E, E1>(f: (_: E) => Cause<E1>) {
  return (cause: Cause<E>): Cause<E1> => chain_(cause, f)
}

/**
 * Builds a Cause depending on the result of another
 */
export function chainSafe_<E, E1>(
  cause: Cause<E>,
  f: (_: E) => Cause<E1>
): S.IO<Cause<E1>> {
  switch (cause._tag) {
    case "Empty": {
      return S.succeed(empty)
    }
    case "Fail": {
      return S.succeed(f(cause.value))
    }
    case "Die": {
      return S.succeed(cause)
    }
    case "Interrupt": {
      return S.succeed(cause)
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => chainSafe_(cause.left, f)),
        S.suspend(() => chainSafe_(cause.right, f)),
        (l, r) => then(l, r)
      )
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => chainSafe_(cause.left, f)),
        S.suspend(() => chainSafe_(cause.right, f)),
        (l, r) => both(l, r)
      )
    }
    case "Traced": {
      return S.map_(chainSafe_(cause.cause, f), (x) => traced(x, cause.trace))
    }
  }
}

/**
 * Equivalent to chain((a) => Fail(f(a)))
 */
export function map_<E, E1>(cause: Cause<E>, f: (e: E) => E1) {
  return chain_(cause, (e: E) => fail(f(e)))
}

/**
 * Equivalent to chain((a) => Fail(f(a)))
 */
export function map<E, E1>(f: (e: E) => E1) {
  return (cause: Cause<E>) => map_(cause, f)
}

/**
 * Determines if this cause contains or is equal to the specified cause.
 */
export function contains<E, E1 extends E = E>(that: Cause<E1>) {
  return (cause: Cause<E>) =>
    equalsCause(that, cause) ||
    pipe(
      cause,
      reduceLeft(false)((_, c) => (equalsCause(that, c) ? O.some(true) : O.none))
    )
}

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<E>(cause: Cause<E>): readonly unknown[] {
  return pipe(
    cause,
    reduceLeft<readonly unknown[]>([])((a, c) =>
      c._tag === "Die" ? O.some([...a, c.value]) : O.none
    )
  )
}

/**
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export function dieOption<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Die" ? O.some(c.value) : O.none))
  )
}

/**
 * Returns if a cause contains a defect
 */
export function died<E>(cause: Cause<E>) {
  return pipe(
    cause,
    dieOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export function failureOption<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Fail" ? O.some(c.value) : O.none))
  )
}

/**
 * Returns if the cause has a failure in it
 */
export function failed<E>(cause: Cause<E>) {
  return pipe(
    cause,
    failureOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export function failureOrCause<E>(cause: Cause<E>): E.Either<E, Cause<never>> {
  return pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
  )
}

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(cause: Cause<E>) {
  return pipe(
    cause,
    reduceLeft<readonly E[]>([])((a, c) =>
      c._tag === "Fail" ? O.some([...a, c.value]) : O.none
    )
  )
}

/**
 * Remove all `Die` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export function stripSomeDefects(f: (_: unknown) => O.Option<unknown>) {
  return <E>(cause: Cause<E>): O.Option<Cause<E>> => {
    return S.run(stripSomeDefectsSafe(cause, f))
  }
}

/**
 * Remove all `Die` causes that the specified partial function is defined at,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export function stripSomeDefects_<E>(
  cause: Cause<E>,
  f: (_: unknown) => O.Option<unknown>
): O.Option<Cause<E>> {
  return S.run(stripSomeDefectsSafe(cause, f))
}

/**
 * Filter out all `Die` causes according to the specified function,
 * returning `Some` with the remaining causes or `None` if there are no
 * remaining causes.
 */
export function stripSomeDefectsSafe<E>(
  cause: Cause<E>,
  f: (_: unknown) => O.Option<unknown>
): S.IO<O.Option<Cause<E>>> {
  switch (cause._tag) {
    case "Empty": {
      return S.succeed(O.none)
    }
    case "Interrupt": {
      return S.succeed(O.some(cause))
    }
    case "Fail": {
      return S.succeed(O.some(cause))
    }
    case "Die": {
      return S.succeed(O.map_(f(cause.value), die))
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => stripSomeDefectsSafe(cause.left, f)),
        S.suspend(() => stripSomeDefectsSafe(cause.right, f)),
        (l, r) => {
          if (l._tag === "Some" && r._tag === "Some") {
            return O.some(both(l.value, r.value))
          } else if (l._tag === "Some") {
            return l
          } else if (r._tag === "Some") {
            return r
          } else {
            return O.none
          }
        }
      )
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => stripSomeDefectsSafe(cause.left, f)),
        S.suspend(() => stripSomeDefectsSafe(cause.right, f)),
        (l, r) => {
          if (l._tag === "Some" && r._tag === "Some") {
            return O.some(then(l.value, r.value))
          } else if (l._tag === "Some") {
            return l
          } else if (r._tag === "Some") {
            return r
          } else {
            return O.none
          }
        }
      )
    }
    case "Traced": {
      return S.suspend(() => stripSomeDefectsSafe(cause.cause, f))
    }
  }
}

/**
 * Finds the first result matching f
 */
export function find<Z, E>(
  f: (cause: Cause<E>) => O.Option<Z>
): (cause: Cause<E>) => O.Option<Z> {
  return (cause) => S.run(findSafe(f)(cause))
}

/**
 * Finds the first result matching f
 */
export function findSafe<Z, E>(
  f: (cause: Cause<E>) => O.Option<Z>
): (cause: Cause<E>) => S.IO<O.Option<Z>> {
  return (cause) => {
    const apply = f(cause)

    if (apply._tag === "Some") {
      return S.succeed(apply)
    }

    switch (cause._tag) {
      case "Then": {
        return S.chain_(
          S.suspend(() => findSafe(f)(cause.left)),
          (isLeft) => {
            if (isLeft._tag === "Some") {
              return S.succeed(isLeft)
            } else {
              return findSafe(f)(cause.right)
            }
          }
        )
      }
      case "Traced": {
        return S.suspend(() => findSafe(f)(cause.cause))
      }
      case "Both": {
        return S.chain_(
          S.suspend(() => findSafe(f)(cause.left)),
          (isLeft) => {
            if (isLeft._tag === "Some") {
              return S.succeed(isLeft)
            } else {
              return findSafe(f)(cause.right)
            }
          }
        )
      }
      default: {
        return S.succeed(apply)
      }
    }
  }
}

/**
 * Equivalent to chain(identity)
 */
export const flatten = <E>(cause: Cause<Cause<E>>): Cause<E> =>
  pipe(cause, chain(identity))

/**
 * Folds over a cause
 */
export function fold<E, Z>(
  empty: () => Z,
  failCase: (_: E) => Z,
  dieCase: (_: unknown) => Z,
  interruptCase: (_: FiberID) => Z,
  thenCase: (_: Z, __: Z) => Z,
  bothCase: (_: Z, __: Z) => Z,
  tracedCase: (_: Z, __: Trace) => Z
) {
  return (cause: Cause<E>): Z =>
    S.run(
      foldSafe(
        empty,
        failCase,
        dieCase,
        interruptCase,
        thenCase,
        bothCase,
        tracedCase
      )(cause)
    )
}

/**
 * Folds over a cause
 */
export function foldSafe<E, Z>(
  empty: () => Z,
  failCase: (_: E) => Z,
  dieCase: (_: unknown) => Z,
  interruptCase: (_: FiberID) => Z,
  thenCase: (_: Z, __: Z) => Z,
  bothCase: (_: Z, __: Z) => Z,
  tracedCase: (_: Z, __: Trace) => Z
) {
  return (cause: Cause<E>): S.IO<Z> => {
    switch (cause._tag) {
      case "Empty": {
        return S.succeedWith(empty)
      }
      case "Fail": {
        return S.succeed(failCase(cause.value))
      }
      case "Die": {
        return S.succeed(dieCase(cause.value))
      }
      case "Interrupt": {
        return S.succeed(interruptCase(cause.fiberId))
      }
      case "Traced": {
        return S.map_(
          S.suspend(() =>
            foldSafe(
              empty,
              failCase,
              dieCase,
              interruptCase,
              thenCase,
              bothCase,
              tracedCase
            )(cause.cause)
          ),
          (x) => tracedCase(x, cause.trace)
        )
      }
      case "Both": {
        return S.zipWith_(
          S.suspend(() =>
            foldSafe(
              empty,
              failCase,
              dieCase,
              interruptCase,
              thenCase,
              bothCase,
              tracedCase
            )(cause.left)
          ),
          S.suspend(() =>
            foldSafe(
              empty,
              failCase,
              dieCase,
              interruptCase,
              thenCase,
              bothCase,
              tracedCase
            )(cause.right)
          ),
          (l, r) => bothCase(l, r)
        )
      }
      case "Then": {
        return S.zipWith_(
          S.suspend(() =>
            foldSafe(
              empty,
              failCase,
              dieCase,
              interruptCase,
              thenCase,
              bothCase,
              tracedCase
            )(cause.left)
          ),
          S.suspend(() =>
            foldSafe(
              empty,
              failCase,
              dieCase,
              interruptCase,
              thenCase,
              bothCase,
              tracedCase
            )(cause.right)
          ),
          (l, r) => thenCase(l, r)
        )
      }
    }
  }
}

/**
 * Accumulates a state over a Cause
 */
export function reduceLeft<Z>(z: Z) {
  return <E>(f: (z: Z, cause: Cause<E>) => O.Option<Z>): ((cause: Cause<E>) => Z) => {
    return (cause) => {
      let causes: Stack<Cause<E>> | undefined = undefined
      let current: Cause<E> | undefined = cause
      let acc = z
      while (current) {
        const x = f(acc, current)
        acc = x._tag === "Some" ? x.value : acc

        switch (current._tag) {
          case "Then": {
            causes = new Stack(current.right, causes)
            current = current.left
            break
          }
          case "Both": {
            causes = new Stack(current.right, causes)
            current = current.left
            break
          }
          case "Traced": {
            current = current.cause
            break
          }
          default: {
            current = undefined
            break
          }
        }

        if (!current && causes) {
          current = causes.value
          causes = causes.previous
        }
      }
      return acc
    }
  }
}

/**
 * Returns if the cause contains an interruption in it
 */
export function interrupted<E>(cause: Cause<E>) {
  return pipe(
    cause,
    interruptOption,
    O.map(() => true),
    O.getOrElse(() => false)
  )
}

/**
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export function interruptOption<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Interrupt" ? O.some(c.fiberId) : O.none))
  )
}

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function interruptedOnly<E>(cause: Cause<E>) {
  return pipe(
    cause,
    find((c) => (c._tag === "Die" || c._tag === "Fail" ? O.some(false) : O.none)),
    O.getOrElse(() => true)
  )
}

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export function interruptors<E>(cause: Cause<E>): readonly FiberID[] {
  return Array.from(
    pipe(
      cause,
      reduceLeft<Set<FiberID>>(new Set())((s, c) =>
        c._tag === "Interrupt" ? O.some(s.add(c.fiberId)) : O.none
      )
    )
  )
}

/**
 * Determines if the `Cause` is empty.
 */
export function isEmpty<E>(cause: Cause<E>) {
  if (
    cause._tag === "Empty" ||
    (cause._tag === "Traced" && cause.cause._tag === "Empty")
  ) {
    return true
  }
  let causes: Stack<Cause<E>> | undefined = undefined
  let current: Cause<E> | undefined = cause
  while (current) {
    switch (current._tag) {
      case "Die": {
        return false
      }
      case "Fail": {
        return false
      }
      case "Interrupt": {
        return false
      }
      case "Then": {
        causes = new Stack(current.right, causes)
        current = current.left
        break
      }
      case "Both": {
        causes = new Stack(current.right, causes)
        current = current.left
        break
      }
      case "Traced": {
        current = current.cause
        break
      }
      default: {
        current = undefined
      }
    }
    if (!current && causes) {
      current = causes.value
      causes = causes.previous
    }
  }

  return true
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export function keepDefectsSafe<E>(cause: Cause<E>): S.IO<O.Option<Cause<never>>> {
  switch (cause._tag) {
    case "Empty": {
      return S.succeed(O.none)
    }
    case "Fail": {
      return S.succeed(O.none)
    }
    case "Interrupt": {
      return S.succeed(O.none)
    }
    case "Die": {
      return S.succeed(O.some(cause))
    }
    case "Traced": {
      return S.map_(
        S.suspend(() => keepDefectsSafe(cause.cause)),
        (x) => O.map_(x, (_) => traced(_, cause.trace))
      )
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => keepDefectsSafe(cause.left)),
        S.suspend(() => keepDefectsSafe(cause.right)),
        (l, r) => {
          if (l._tag === "Some" && r._tag === "Some") {
            return O.some(then(l.value, r.value))
          } else if (l._tag === "Some") {
            return l
          } else if (r._tag === "Some") {
            return r
          } else {
            return O.none
          }
        }
      )
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => keepDefectsSafe(cause.left)),
        S.suspend(() => keepDefectsSafe(cause.right)),
        (l, r) => {
          if (l._tag === "Some" && r._tag === "Some") {
            return O.some(both(l.value, r.value))
          } else if (l._tag === "Some") {
            return l
          } else if (r._tag === "Some") {
            return r
          } else {
            return O.none
          }
        }
      )
    }
  }
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export function keepDefects<E>(cause: Cause<E>): O.Option<Cause<never>> {
  return S.run(keepDefectsSafe(cause))
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEither<E, A>(
  c: Cause<E.Either<E, A>>
): E.Either<Cause<E>, A> {
  return S.run(sequenceCauseEitherSafe(c))
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEitherSafe<E, A>(
  c: Cause<E.Either<E, A>>
): S.IO<E.Either<Cause<E>, A>> {
  switch (c._tag) {
    case "Empty": {
      return S.succeed(E.left(empty))
    }
    case "Interrupt": {
      return S.succeed(E.left(c))
    }
    case "Fail": {
      return S.succeed(
        c.value._tag === "Left" ? E.left(fail(c.value.left)) : E.right(c.value.right)
      )
    }
    case "Traced": {
      return S.map_(
        S.suspend(() => sequenceCauseEitherSafe(c.cause)),
        (x) => E.mapLeft_(x, (_) => traced(_, c.trace))
      )
    }
    case "Die": {
      return S.succeed(E.left(c))
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => sequenceCauseEitherSafe(c.left)),
        S.suspend(() => sequenceCauseEitherSafe(c.right)),
        (l, r) => {
          if (l._tag === "Left") {
            if (r._tag === "Right") {
              return E.right(r.right)
            } else {
              return E.left(then(l.left, r.left))
            }
          } else {
            return E.right(l.right)
          }
        }
      )
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => sequenceCauseEitherSafe(c.left)),
        S.suspend(() => sequenceCauseEitherSafe(c.right)),
        (l, r) => {
          if (l._tag === "Left") {
            if (r._tag === "Right") {
              return E.right(r.right)
            } else {
              return E.left(both(l.left, r.left))
            }
          } else {
            return E.right(l.right)
          }
        }
      )
    }
  }
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 */
export function sequenceCauseOptionSafe<E>(
  c: Cause<O.Option<E>>
): S.IO<O.Option<Cause<E>>> {
  switch (c._tag) {
    case "Empty": {
      return S.succeed(O.some(empty))
    }
    case "Interrupt": {
      return S.succeed(O.some(c))
    }
    case "Traced": {
      return S.map_(
        S.suspend(() => sequenceCauseOptionSafe(c.cause)),
        (x) => O.map_(x, (_) => traced(_, c.trace))
      )
    }
    case "Fail": {
      return S.succeed(O.map_(c.value, fail))
    }
    case "Die": {
      return S.succeed(O.some(c))
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => sequenceCauseOptionSafe(c.left)),
        S.suspend(() => sequenceCauseOptionSafe(c.right)),
        (l, r) => {
          if (l._tag === "Some" && r._tag === "Some") {
            return O.some(then(l.value, r.value))
          } else if (l._tag === "Some") {
            return O.some(l.value)
          } else if (r._tag === "Some") {
            return O.some(r.value)
          } else {
            return O.none
          }
        }
      )
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => sequenceCauseOptionSafe(c.left)),
        S.suspend(() => sequenceCauseOptionSafe(c.right)),
        (l, r) => {
          if (l._tag === "Some" && r._tag === "Some") {
            return O.some(both(l.value, r.value))
          } else if (l._tag === "Some") {
            return O.some(l.value)
          } else if (r._tag === "Some") {
            return O.some(r.value)
          } else {
            return O.none
          }
        }
      )
    }
  }
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
 * recursively stripping out any failures with the error `None`.
 */
export function sequenceCauseOption<E>(c: Cause<O.Option<E>>): O.Option<Cause<E>> {
  return S.run(sequenceCauseOptionSafe(c))
}

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export function squash<E>(f: (e: E) => unknown) {
  return (cause: Cause<E>): unknown =>
    pipe(
      cause,
      failureOption,
      O.map(f),
      (o) =>
        o._tag === "Some"
          ? o
          : interrupted(cause)
          ? O.some<unknown>(
              new InterruptedException(
                "Interrupted by fibers: " +
                  Array.from(interruptors(cause))
                    .map((_) => _.seqNumber.toString())
                    .map((_) => "#" + _)
                    .join(", ")
              )
            )
          : O.none,
      (o) => (o._tag === "Some" ? o : A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException())
    )
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<E>(cause: Cause<E>): Cause<never> {
  switch (cause._tag) {
    case "Empty": {
      return empty
    }
    case "Fail": {
      return empty
    }
    case "Interrupt": {
      return cause
    }
    case "Die": {
      return cause
    }
    default: {
      return S.run(stripFailuresSafe(cause))
    }
  }
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailuresSafe<E>(cause: Cause<E>): S.IO<Cause<never>> {
  switch (cause._tag) {
    case "Empty": {
      return S.succeed(empty)
    }
    case "Fail": {
      return S.succeed(empty)
    }
    case "Interrupt": {
      return S.succeed(cause)
    }
    case "Die": {
      return S.succeed(cause)
    }
    case "Traced": {
      return S.map_(
        S.suspend(() => stripFailuresSafe(cause.cause)),
        (x) => traced(x, cause.trace)
      )
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => stripFailuresSafe(cause.left)),
        S.suspend(() => stripFailuresSafe(cause.right)),
        (l, r) => both(l, r)
      )
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => stripFailuresSafe(cause.left)),
        S.suspend(() => stripFailuresSafe(cause.right)),
        (l, r) => then(l, r)
      )
    }
  }
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripInterrupts<E>(cause: Cause<E>): Cause<E> {
  switch (cause._tag) {
    case "Empty": {
      return empty
    }
    case "Fail": {
      return cause
    }
    case "Interrupt": {
      return empty
    }
    case "Die": {
      return cause
    }
    default: {
      return S.run(stripInterruptsSafe(cause))
    }
  }
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripInterruptsSafe<E>(cause: Cause<E>): S.IO<Cause<E>> {
  switch (cause._tag) {
    case "Empty": {
      return S.succeed(empty)
    }
    case "Fail": {
      return S.succeed(cause)
    }
    case "Interrupt": {
      return S.succeed(empty)
    }
    case "Die": {
      return S.succeed(cause)
    }
    case "Traced": {
      return S.map_(
        S.suspend(() => stripInterruptsSafe(cause.cause)),
        (x) => traced(x, cause.trace)
      )
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => stripInterruptsSafe(cause.left)),
        S.suspend(() => stripInterruptsSafe(cause.right)),
        (l, r) => both(l, r)
      )
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => stripInterruptsSafe(cause.left)),
        S.suspend(() => stripInterruptsSafe(cause.right)),
        (l, r) => then(l, r)
      )
    }
  }
}

export function isCause(u: unknown): u is Cause<unknown> {
  return (
    typeof u === "object" &&
    u !== null &&
    "_tag" in u &&
    ["Empty", "Fail", "Die", "Interrupt", "Then", "Both", "Traced"].includes(u["_tag"])
  )
}

/**
 * Returns a `Cause` that has been stripped of all tracing information.
 */
export function untraced<E>(cause: Cause<E>): Cause<E> {
  switch (cause._tag) {
    case "Die":
    case "Empty":
    case "Fail":
    case "Interrupt":
      return cause
    default:
      return S.run(untracedSafe(cause))
  }
}

/**
 * Returns a `Cause` that has been stripped of all tracing information.
 */
export function untracedSafe<E>(cause: Cause<E>): S.IO<Cause<E>> {
  switch (cause._tag) {
    case "Traced": {
      return S.suspend(() => untracedSafe(cause.cause))
    }
    case "Both": {
      return S.zipWith_(
        S.suspend(() => untracedSafe(cause.left)),
        S.suspend(() => untracedSafe(cause.right)),
        (l, r) => both(l, r)
      )
    }
    case "Then": {
      return S.zipWith_(
        S.suspend(() => untracedSafe(cause.left)),
        S.suspend(() => untracedSafe(cause.right)),
        (l, r) => then(l, r)
      )
    }
    default: {
      return S.succeed(cause)
    }
  }
}
