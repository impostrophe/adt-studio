import { Trans } from "@lingui/react/macro"
import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBookRun } from "@/hooks/use-book-run"
import { useApiKey, useBookStructuredTextAvailability } from "@/hooks/use-api-key"
import { useHasUnsavedChanges } from "./floating-save"

/** The source generator's retained content remains usable during a retry. */
export function SourceGenerationNotice({ bookLabel, stage }: { bookLabel: string; stage: string }) {
  const { sourceUpdateStages = [] } = useBookRun()
  return sourceUpdateStages.includes(stage) ? <UpdateNotice bookLabel={bookLabel} stage={stage} /> : null
}

function UpdateNotice({ bookLabel, stage }: { bookLabel: string; stage: string }) {
  const { isRunning, isCancelling, queueRun } = useBookRun()
  const { apiKey } = useApiKey()
  const hasProvider = useBookStructuredTextAvailability(bookLabel)
  const hasUnsavedChanges = useHasUnsavedChanges()
  const disabled = isRunning || isCancelling || hasUnsavedChanges || !hasProvider
  return (
    <div role="status" className="m-4 mb-0 flex shrink-0 items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium"><Trans>Generated before your latest edits</Trans></p>
        <p><Trans>Your content is retained. Re-run this stage to update it from the edited book.</Trans></p>
        {hasUnsavedChanges && <p><Trans>Save or discard your changes before re-running.</Trans></p>}
        {!hasProvider && <p><Trans>Configure an AI provider in Settings to re-run this stage.</Trans></p>}
      </div>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => {
        if (!disabled) queueRun({ fromStage: stage, toStage: stage, apiKey, viewAfter: true })
      }}><Trans>Re-run</Trans></Button>
    </div>
  )
}
