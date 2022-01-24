import * as M from "../../../collection/immutable/Map"
import * as O from "../../../data/Option"
import type { FiberRef, Runtime } from "../../FiberRef"
import { set_ as fiberRefSet_ } from "../../FiberRef/operations/set"
import type { UIO } from "../definition"
import { IFiberRefGetAll } from "../definition"
import { forEachDiscard_ } from "./excl-forEach"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * `FiberRefs` is a data type that represents a collection of `FiberRef` values.
 * This allows safely propagating `FiberRef` values across fiber boundaries, for
 * example between an asynchronous producer and consumer.
 */
export class FiberRefs {
  #fiberRefLocals: M.Map<FiberRef.Runtime<any>, any>

  constructor(fiberRefLocals: M.Map<FiberRef.Runtime<any>, any>) {
    this.#fiberRefLocals = fiberRefLocals
  }

  /**
   * Returns a set of each `FiberRef` in this collection.
   */
  get fiberRefs(): ReadonlySet<FiberRef.Runtime<any>> {
    return new Set(this.#fiberRefLocals.keys())
  }

  /**
   * Sets the value of each `FiberRef` for the fiber running this effect to the
   * value in this collection of `FiberRef` values.
   */
  get setAll(): UIO<void> {
    return forEachDiscard_(this.fiberRefs, (fiberRef) =>
      fiberRefSet_(fiberRef, this.getOrDefault(fiberRef))
    )
  }

  /**
   * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
   * values if it exists or `None` otherwise.
   */
  get<A>(fiberRef: FiberRef.Runtime<A>): O.Option<A> {
    return M.lookup_(this.#fiberRefLocals, fiberRef)
  }

  /**
   * Gets the value of the specified `FiberRef` in this collection of `FiberRef`
   * values if it exists or the `initial` value of the `FiberRef` otherwise.
   */
  getOrDefault<A>(fiberRef: FiberRef.Runtime<A>): A {
    return O.getOrElse_(this.get(fiberRef), () => (fiberRef as Runtime<A>).initial)
  }
}

/**
 * Returns a collection of all `FiberRef` values for the fiber running this
 * effect.
 *
 * @ets static ets/EffectOps getFiberRefs
 */
export const getFiberRefs: UIO<FiberRefs> = new IFiberRefGetAll((fiberRefLocals) =>
  succeedNow(new FiberRefs(fiberRefLocals))
)

/**
 * Sets the `FiberRef` values for the fiber running this effect to the values
 * in the specified collection of `FiberRef` values.
 *
 * @ets static ets/EffectOps setFiberRefs
 */
export function setFiberRefs(fiberRefs: FiberRefs, __etsTrace?: string): UIO<void> {
  return suspendSucceed(() => fiberRefs.setAll)
}
