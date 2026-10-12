import { PageSectioningOutput, WebRenderingOutput, type StoryboardCoverage } from "@adt/types"
import type { Storage } from "@adt/storage"
import { getRenderSectioningRow, resolveRenderedSection } from "./render-sectioning.js"

/** Coverage uses current records and stable owners, never attempts or historical
 * HTML. Empty/pruned trees need no output; unreadable trees remain missing. */
export function storyboardCoverage(storage: Storage, pageIds = storage.getPages().map((page) => page.pageId)): StoryboardCoverage {
  const missingPages: string[] = []
  const missingSections: Array<{ pageId: string; sectionId: string }> = []
  let included = 0
  let rendered = 0
  for (const pageId of pageIds) {
    let input: unknown
    let rendering: unknown
    try { input = getRenderSectioningRow(storage, pageId)?.data } catch (error) { if (!(error instanceof SyntaxError)) throw error }
    try { rendering = storage.getLatestNodeData("web-rendering", pageId)?.data } catch (error) { if (!(error instanceof SyntaxError)) throw error }
    const source = PageSectioningOutput.safeParse(input)
    if (!source.success) { missingPages.push(pageId); continue }
    const output = WebRenderingOutput.safeParse(rendering)
    for (const section of source.data.sections.filter((section) => !section.isPruned)) {
      included++
      const matches = output.success ? output.data.sections.filter((entry) =>
        entry.html.trim() && resolveRenderedSection(entry, source.data.sections) === section) : []
      if (matches.length === 1) rendered++
      else missingSections.push({ pageId, sectionId: section.sectionId })
    }
  }
  return { complete: pageIds.length > 0 && !missingPages.length && !missingSections.length, included, rendered, missingPages, missingSections }
}
