import { z } from "zod"

export const PackagingStatus = z.object({
  label: z.string(),
  hasAdt: z.boolean(),
  version: z.string().optional(),
  /** False only for known mode-incompatible output; usable freshness warnings
   * and legacy packages keep their existing availability semantics. */
  modeCompatible: z.boolean().optional(),
})
export type PackagingStatus = z.infer<typeof PackagingStatus>
