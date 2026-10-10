/**
 * Render-sectioning resolver.
 *
 * `page-sectioning` always holds the *semantic* LLM tree — it's what the Studio
 * Sectioning view shows and what section-edit endpoints operate on, and it
 * survives render-strategy changes untouched.
 *
 * Fixed-layout books, however, render from a *positioned* tree whose node ids
 * match the absolutely-positioned `data-id`s in the rendered HTML. That tree is
 * stored separately, in `fixed-layout-sectioning`, so it never clobbers the
 * semantic tree. The whole content pipeline (web-rendering, text-catalog,
 * packaging, TTS, easy-read, glossary, toc, captions, quizzes) must read the
 * tree that matches the rendered HTML, so it goes through this resolver.
 *
 * Selection follows published output rather than config. Fixed rendering
 * publishes its positioned tree alongside HTML. Reflowable publication appends
 * a null positioned-tree version in that same transaction, retaining the old
 * tree in history. A config change alone never switches the active tree.
 */
import type { NodeDataRow, Storage } from "@adt/storage"
import type { PageSectioningOutput } from "@adt/types"
import { PageSectioningOutput as PageSectioningOutputSchema } from "@adt/types"

export const FIXED_LAYOUT_SECTIONING_NODE = "fixed-layout-sectioning"
export const PAGE_SECTIONING_NODE = "page-sectioning"

/**
 * The latest sectioning row a page is CURRENTLY rendered from: the positioned
 * `fixed-layout-sectioning` when present, else the semantic `page-sectioning`.
 * Returns the raw row so callers that need the version still have it.
 */
export function getRenderSectioningRow(
  storage: Storage,
  pageId: string,
): NodeDataRow | null {
  const positioned = storage.getLatestNodeData(FIXED_LAYOUT_SECTIONING_NODE, pageId)
  return positioned && positioned.data !== null
    ? positioned
    : storage.getLatestNodeData(PAGE_SECTIONING_NODE, pageId)
}

/** Parsed convenience wrapper around {@link getRenderSectioningRow}. */
export function getRenderSectioning(
  storage: Storage,
  pageId: string,
): PageSectioningOutput | undefined {
  const row = getRenderSectioningRow(storage, pageId)
  if (!row) return undefined
  const parsed = PageSectioningOutputSchema.safeParse(row.data)
  return parsed.success ? parsed.data : undefined
}

/**
 * The semantic `page-sectioning` tree, regardless of render strategy. Unlike
 * {@link getRenderSectioning} this never returns the positioned fixed-layout
 * tree, so callers that need semantic roles (e.g. `heading`) — absent from the
 * positioned tree — read from here.
 */
export function getSemanticSectioning(
  storage: Storage,
  pageId: string,
): PageSectioningOutput | undefined {
  const row = storage.getLatestNodeData(PAGE_SECTIONING_NODE, pageId)
  if (!row) return undefined
  const parsed = PageSectioningOutputSchema.safeParse(row.data)
  return parsed.success ? parsed.data : undefined
}
