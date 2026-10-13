import type { QueryClient } from "@tanstack/react-query"

/** Refresh the completed book and the list without overlapping prefixes.
 * Explicit cancellation also covers initial loads with no cached data: those
 * reads may have captured an older state before final publication. */
export async function invalidateBookQueries(client: QueryClient, label: string) {
  const filters = [
    { queryKey: ["books", label] },
    { queryKey: ["books"], exact: true },
    { queryKey: ["package-adt-status", label] },
    { queryKey: ["debug"] },
  ]
  await Promise.all(filters.map((filter) => client.cancelQueries(filter)))
  await Promise.all(filters.map((filter) => client.invalidateQueries(filter)))
}

/** Supersede even an initial status read captured before admission/settlement. */
export async function refreshRunStatus(client: QueryClient, label: string) {
  const filter = { queryKey: ["books", label, "step-status"] }
  await client.cancelQueries(filter)
  await client.invalidateQueries(filter)
}

/** Polls and terminal events converge on the server's publication revision.
 * Remember recent receipts across route remounts, claiming before refresh so
 * its own status read cannot recursively trigger another aggregate refresh. */
export async function reconcileRunPublication(client: QueryClient, label: string, revision: string) {
  const key = ["books", label, "observed-run-publications"]
  const seen = client.getQueryData<string[]>(key) ?? []
  if (seen.includes(revision)) return
  client.setQueryData(key, [...seen.slice(-31), revision])
  await invalidateBookQueries(client, label)
}
