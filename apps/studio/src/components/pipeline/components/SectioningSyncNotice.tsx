import { Trans, useLingui } from "@lingui/react/macro"
import { Link } from "@tanstack/react-router"
import type { SectioningSynchronization, SectionSyncStatus } from "@adt/types"

/** Server-derived only: save flags and task success never dismiss this notice. */
export function SectioningSyncNotice({ synchronization, bookLabel, pageId, showStoryboardLink = false }: {
  synchronization?: SectioningSynchronization
  bookLabel: string
  pageId: string
  showStoryboardLink?: boolean
}) {
  const { t } = useLingui()
  if (!synchronization) return null
  const affected = synchronization.sections.filter((section) => section.status !== "current")
  const fixed = synchronization.layout === "fixed"
  if (!fixed && affected.length === 0 && synchronization.diagnostics.length === 0) return null

  const description = (status: SectionSyncStatus): string => {
    switch (status) {
      case "protected-divergence": return t`Rendered text is protected or differs from its source. Review it before replacing it.`
      case "structural-drift": return t`The section structure or identity no longer matches the rendering.`
      case "invalid-rendering": return t`The rendering is missing or cannot be matched safely.`
      case "fixed-layout-unmapped": return t`Semantic text does not update the positioned page.`
      default: return t`The relationship between this source and the saved rendering is unverified.`
    }
  }

  return (
    <aside role="status" aria-live="polite" aria-label={t`Sectioning and Storyboard correspondence`} className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 space-y-2">
      <p className="font-semibold">{fixed ? t`Fixed-layout text editing` : t`Storyboard correspondence needs review`}</p>
      <p>{fixed
        ? t`Text edits in Sectioning change semantic content, but do not change the visible positioned page. Use Storyboard to edit that page. Rerendering semantic text cannot synchronize it.`
        : t`Review the saved source and preview before making further changes. Automatic synchronization and targeted repair are not available for these sections.`}</p>
      {!fixed && affected.length > 0 && (
        <ul className="max-h-32 overflow-y-auto list-disc pl-4 space-y-1">
          {affected.map((section, index) => (
            <li key={`${section.sectionId}:${index}`}><span className="font-mono">{section.sectionId}</span>{": "}{description(section.status)}</li>
          ))}
        </ul>
      )}
      {synchronization.diagnostics.length > 0 && <p><Trans>Some source or rendering data could not be verified. Review this page in Storyboard.</Trans></p>}
      {showStoryboardLink && (
        <Link className="inline-block underline focus-visible:outline-2 focus-visible:outline-offset-2" to="/books/$label/$step/$pageId" params={{ label: bookLabel, step: "storyboard", pageId }}>
          <Trans>Open Storyboard</Trans>
        </Link>
      )}
    </aside>
  )
}
