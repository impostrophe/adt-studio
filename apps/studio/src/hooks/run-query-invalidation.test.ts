import { expect, it } from "vitest"
import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { invalidateBookQueries } from "./run-query-invalidation"

it.each([false, true])("ignores pre-publication responses including initial reads (initial: %s)", async (initial) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const keys = [["books", "book", "outputs", "summary"], ["books", "book", "text-catalog"], ["books", "book", "pages", "pg001"], ["books"], ["books", "other", "outputs"]]
  const counts = keys.map(() => 0)
  let serverVersion = 1
  let finishOldRead: (() => void) | undefined
  const observers = keys.map((queryKey, index) => new QueryObserver(client, { queryKey, queryFn: async () => {
    counts[index]++
    const capturedVersion = serverVersion
    if (index === 0 && counts[index] === (initial ? 1 : 2)) {
      await new Promise<void>((resolve) => { finishOldRead = resolve })
    }
    return capturedVersion
  } }))
  const unsubscribe = observers.map((observer) => observer.subscribe(() => {}))
  try {
    if (!initial) await Promise.all(keys.map((queryKey) => client.fetchQuery({ queryKey })))
    const oldRefresh = initial ? Promise.resolve() : client.invalidateQueries({ queryKey: ["books", "book", "outputs"] })
    expect(finishOldRead).toBeDefined()
    serverVersion = 2
    await invalidateBookQueries(client, "book")
    expect(counts).toEqual([initial ? 2 : 3, 2, 2, 2, 1])
    expect(keys.map((queryKey) => client.getQueryData(queryKey))).toEqual([2, 2, 2, 2, 1])
    finishOldRead!()
    await oldRefresh
    await Promise.resolve()
    expect(client.getQueryData(keys[0])).toBe(2)
    expect(counts).toEqual([initial ? 2 : 3, 2, 2, 2, 1])
  } finally { unsubscribe.forEach((stop) => stop()); client.clear() }
})
