import type { OutputStatus } from "@adt/types"

/** One primary issue per row keeps the summary counts additive. Full warning
 * reasons remain available in the row details. */
export function reviewStatus(output: OutputStatus) {
  if (output.missing) return "missing"
  if (output.updateNeeded) return "update"
  if (output.protected && output.warnings.some((warning) => !warning.source)) return "review"
  return "warning"
}
