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
