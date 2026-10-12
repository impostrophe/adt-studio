import { useLingui } from "@lingui/react/macro"
import { TriangleAlert } from "lucide-react"
import type { OutputScopeSummary, StageName } from "@adt/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getStageLabelI18n } from "../pipeline-i18n"
import { CatalogSummary } from "./OutputReview"

/** Job errors/progress keep their own indicator; this opens the saved outputs
 * needing attention, even when the last attempt completed successfully. */
export function StageOutputStatus({ bookLabel, stage, summary }: {
  bookLabel: string; stage: string; summary: OutputScopeSummary
}) {
  const { t } = useLingui()
  const { updates, warnings, missing } = summary
  if (!updates && !warnings && !missing) return null
  const label = getStageLabelI18n(stage)
  const description = t`Updates: ${updates}. Warnings: ${warnings}. Missing: ${missing}.`
  const title = t`Review ${label} outputs`
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" aria-label={`${title}. ${description}`} title={`${title}. ${description}`}
        className="relative z-20 shrink-0 rounded p-1 text-amber-500 hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <TriangleAlert className="h-4 w-4" />
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-3xl">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <CatalogSummary bookLabel={bookLabel} stage={stage as StageName} expanded />
    </DialogContent>
  </Dialog>
}
