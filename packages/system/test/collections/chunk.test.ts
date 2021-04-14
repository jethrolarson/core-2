import * as Chunk from "../../src/Collections/Immutable/Chunk"
import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import * as O from "../../src/Option"

describe("Chunk", () => {
  it("append", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5)
      )
    ).equals(Chunk.many(1, 2, 3, 4, 5))
  })
  it("prepend", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.prepend(2),
        Chunk.prepend(3),
        Chunk.prepend(4),
        Chunk.prepend(5)
      )
    ).equals(Chunk.many(5, 4, 3, 2, 1))
  })
  it("fromArray", () => {
    expect(pipe(Chunk.array([1, 2, 3, 4, 5]), Chunk.append(6), Chunk.append(7))).equals(
      Chunk.many(1, 2, 3, 4, 5, 6, 7)
    )
  })
  it("concat", () => {
    expect(
      pipe(Chunk.array([1, 2, 3, 4, 5]), Chunk.concat(Chunk.array([6, 7, 8, 9, 10])))
    ).equals(Chunk.many(1, 2, 3, 4, 5, 6, 7, 8, 9, 10))
  })
  it("iterable", () => {
    expect(Chunk.toArrayLike(Chunk.array([0, 1, 2]))).toEqual([0, 1, 2])
  })
  it("get", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.get(3)
      )
    ).toEqual(O.some(4))
  })
  it("buffer", () => {
    expect(
      pipe(
        Chunk.array(Buffer.from("hello")),
        Chunk.concat(Chunk.array(Buffer.from(" "))),
        Chunk.concat(Chunk.array(Buffer.from("world"))),
        Chunk.drop(6),
        Chunk.append(32),
        Chunk.prepend(32),
        Chunk.toArrayLike
      )
    ).toEqual(Buffer.from(" world "))
  })
  it("stack", () => {
    let a = Chunk.empty<number>()
    for (let i = 0; i < 100_000; i++) {
      a = Chunk.concat_(a, Chunk.array([i, i]))
    }
    expect(Chunk.toArrayLike(a).length).toEqual(200_000)
  })
  it("take", () => {
    expect(
      pipe(
        Chunk.array([1, 2, 3, 4, 5]),
        Chunk.concat(Chunk.array([6, 7, 8, 9, 10])),
        Chunk.take(5)
      )
    ).equals(Chunk.many(1, 2, 3, 4, 5))
  })
  it("drop", () => {
    expect(
      pipe(
        Chunk.array([1, 2, 3, 4, 5]),
        Chunk.concat(Chunk.array([6, 7, 8, 9, 10])),
        Chunk.drop(5)
      )
    ).equals(Chunk.many(6, 7, 8, 9, 10))
  })
  it("map", () => {
    expect(
      pipe(
        Chunk.array(Buffer.from("hello-world")),
        Chunk.map((n) => (n === 45 ? 32 : n)),
        Chunk.toArrayLike
      )
    ).toEqual(Buffer.from("hello world"))
  })
  it("chain", () => {
    expect(
      pipe(
        Chunk.array(Buffer.from("hello-world")),
        Chunk.chain((n) =>
          n === 45 ? Chunk.array(Buffer.from("-|-")) : Chunk.single(n)
        ),
        Chunk.toArrayLike
      )
    ).toEqual(Buffer.from("hello-|-world"))
  })
  it("collectM", async () => {
    const result = await pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.collectM((n) => (n >= 2 ? O.some(T.succeed(n)) : O.none)),
      T.runPromise
    )
    expect(result).equals(Chunk.many(2, 3))
  })
  it("arrayLikeIterator", () => {
    const it = pipe(
      Chunk.single(0),
      Chunk.concat(Chunk.single(1)),
      Chunk.concat(Chunk.single(2)),
      Chunk.concat(Chunk.single(3))
    )

    expect(Array.from(Chunk.buckets(it))).toEqual([
      Buffer.of(0),
      Buffer.of(1),
      Buffer.of(2),
      Buffer.of(3)
    ])
  })
  it("equals", () => {
    const a = pipe(
      Chunk.single(0),
      Chunk.concat(Chunk.single(1)),
      Chunk.concat(Chunk.single(2)),
      Chunk.concat(Chunk.single(3)),
      Chunk.concat(Chunk.single(4))
    )
    const b = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.append(4)
    )
    expect(a).equals(b)
  })
  it("dropWhile", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.dropWhile((n) => n < 2)
      )
    ).equals(Chunk.array([2, 3, 4]))
  })
  it("dropWhileM", async () => {
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.dropWhileM((n) => T.delay(1)(T.succeed(n < 2))),
        T.runPromise
      )
    ).equals(Chunk.array([2, 3, 4]))
  })
  it("filter", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.filter((n) => n >= 2)
      )
    ).equals(Chunk.array([2, 3, 4]))
  })
  it("filterM", async () => {
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.filterM((n) => T.delay(1)(T.succeed(n >= 2))),
        T.runPromise
      )
    ).equals(Chunk.array([2, 3, 4]))
  })
  it("exists", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.exists((n) => n === 3)
      )
    ).toEqual(true)
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.exists((n) => n === 6)
      )
    ).toEqual(false)
  })
  it("find", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.find((n) => n > 2)
      )
    ).toEqual(O.some(3))
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.find((n) => n === 6)
      )
    ).toEqual(O.none)
  })
  it("reduceM", async () => {
    const order = [] as number[]
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.reduceM(0, (s, a) =>
          T.succeedWith(() => {
            order.push(a)
            return s + a
          })
        ),
        T.runPromise
      )
    ).toEqual(10)
    expect(order).toEqual([0, 1, 2, 3, 4])
  })
  it("reduceRightM", async () => {
    const order = [] as number[]
    expect(
      await pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.reduceRightM(0, (a, s) =>
          T.succeedWith(() => {
            order.push(a)
            return s + a
          })
        ),
        T.runPromise
      )
    ).toEqual(10)
    expect(order).toEqual([4, 3, 2, 1, 0])
  })
  it("indexWhere", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(1),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.indexWhereFrom(2, (n) => n > 2)
      )
    ).toEqual(4)
  })
  it("split", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.split(2)
      )
    ).equals(Chunk.many(Chunk.array([0, 1, 2]), Chunk.array([3, 4, 5])))

    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.split(4)
      )
    ).equals(
      Chunk.many(Chunk.many(0, 1), Chunk.many(2, 3), Chunk.single(4), Chunk.single(5))
    )

    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.split(5)
      )
    ).equals(
      Chunk.many(
        Chunk.many(0, 1),
        Chunk.many(2),
        Chunk.many(3),
        Chunk.many(4),
        Chunk.many(5)
      )
    )

    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.append(6),
        Chunk.split(5)
      )
    ).equals(
      Chunk.many(
        Chunk.many(0, 1),
        Chunk.many(2, 3),
        Chunk.many(4),
        Chunk.many(5),
        Chunk.many(6)
      )
    )
  })
  it("splitWhere", () => {
    expect(
      pipe(
        Chunk.single(0),
        Chunk.append(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.append(5),
        Chunk.splitWhere((n) => n === 3)
      )
    ).equals([Chunk.array([0, 1, 2]), Chunk.array([3, 4, 5])])
  })
  it("zip", () => {
    const left = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3)
    )
    const right = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.append(4)
    )
    expect(pipe(left, Chunk.zip(right))).equals(
      Chunk.many([0, 0], [1, 1], [2, 2], [3, 3])
    )
    expect(pipe(right, Chunk.zip(left))).equals(
      Chunk.many([0, 0], [1, 1], [2, 2], [3, 3])
    )
  })
  it("zipAll", () => {
    const left = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3)
    )
    const right = pipe(
      Chunk.single(0),
      Chunk.append(1),
      Chunk.append(2),
      Chunk.append(3),
      Chunk.append(4)
    )
    expect(pipe(left, Chunk.zipAll(right))).equals(
      Chunk.many(
        [O.some(0), O.some(0)],
        [O.some(1), O.some(1)],
        [O.some(2), O.some(2)],
        [O.some(3), O.some(3)],
        [O.none, O.some(4)]
      )
    )
    expect(pipe(right, Chunk.zipAll(left))).equals(
      Chunk.many(
        [O.some(0), O.some(0)],
        [O.some(1), O.some(1)],
        [O.some(2), O.some(2)],
        [O.some(3), O.some(3)],
        [O.some(4), O.none]
      )
    )
  })
  it("zipWithIndex", () => {
    expect(
      pipe(
        Chunk.single(1),
        Chunk.append(2),
        Chunk.append(3),
        Chunk.append(4),
        Chunk.zipWithIndex
      )
    ).equals(Chunk.many([1, 0], [2, 1], [3, 2], [4, 3]))
  })
  it("fill", () => {
    expect(Chunk.fill(10, (n) => n + 1)).equals(
      Chunk.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    )
  })
  it("equality", () => {
    expect(Chunk.many(0, 1, 2)).equals(Chunk.array([0, 1, 2]))
  })
})
