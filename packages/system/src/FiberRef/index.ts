// ets_tracing: off

import "../Operator"

/**
 * Ported from https://github.com/zio/zio/blob/series/2.x/core/shared/src/main/scala/zio/ZFiberRef.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

// codegen:start {preset: barrel, include: ./*.ts, exclude: ./excl-*.ts}
export * from "./fiberRef"
export * from "./get"
export * from "./getAndSet"
export * from "./getAndUpdate"
export * from "./getAndUpdateSome"
export * from "./locally"
export * from "./make"
export * from "./modify"
export * from "./modifySome"
export * from "./set"
export * from "./update"
export * from "./updateAndGet"
export * from "./updateSome"
export * from "./updateSomeAndGet"
// codegen:end
