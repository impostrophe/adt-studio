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
 * Selection is by node presence rather than config: `fixed-layout-sectioning`
 * is a `storyboard`-stage output, so `clearNodesByType` deletes it at the start
 * of every storyboard rerun and `processFixedLayoutPages` only re-writes it for
 * fixed-layout books. Its presence therefore reliably means "this page is
 * currently rendered fixed-layout" — including after a fixed→reflowable toggle,
 * which clears it.
 */
import type { NodeDataRow, Storage } from "@adt/storage"
import type { PageSectioningOutput, PageSectioningSection, SectionRendering, PackagingWarning } from "@adt/types"
import { PageSectioningOutput as PageSectioningOutputSchema, WebRenderingOutput } from "@adt/types"
import { parseDocument, DomUtils } from "htmlparser2"
import { inputSignature } from "./output-freshness.js"

export const FIXED_LAYOUT_SECTIONING_NODE = "fixed-layout-sectioning"
export const PAGE_SECTIONING_NODE = "page-sectioning"

export function renderingOwnerSignature(rendering: SectionRendering): string {
  const doc = parseDocument(rendering.html)
  const owners = DomUtils.findAll(element => element.type === "tag" && element.attribs["data-section-id"] !== undefined, doc.children)
    .map(element => element.attribs["data-section-id"])
  // Ownership evidence covers identity declarations, not media or freshness.
  // Content/version guards protect the exact snapshot during the review action.
  return inputSignature({ sectionId: rendering.sectionId, sectionType: rendering.sectionType, owners })
}

/** Resolve the owner of retained HTML, independently of the latest source order.
 * Adapted from SPEC-0012's stable HTML identity rule (PR #888). Identityless or
 * contradictory legacy content is retained but cannot be assigned to a section:
 * even matching leaf IDs may have moved since this rendering was produced.
 */
export function renderedSectionId(rendering: SectionRendering): string | undefined {
  return declaredSectionId(rendering, false)
}

function declaredSectionId(rendering: SectionRendering, legacyRoot: boolean): string | undefined {
  // An explicit repair may override contradictory legacy attributes without
  // rewriting them: custom scripts can refer to those exact selector strings.
  if (rendering.sectionId && rendering.ownerReview?.signature === renderingOwnerSignature(rendering)) return rendering.sectionId
  const doc = parseDocument(rendering.html)
  const owners = DomUtils.findAll((element) => element.type === "tag" && element.attribs["data-section-id"] !== undefined, doc.children)
  if (owners.length > 1) return undefined
  // The original custom-activity producer stored the stable section ID on the
  // outer <section data-id>. This is an explicit root identity, not a leaf or
  // the current array position. The caller still requires one matching owner.
  const legacyRoots = legacyRoot && !owners.length && !rendering.sectionId
    ? DomUtils.findAll((element) => element.type === "tag" && element.name === "section" &&
      element.attribs["data-section-type"] === rendering.sectionType &&
      /^pg\d+_(?:s\d+|sec\d+)$/.test(element.attribs["data-id"] ?? ""), doc.children)
    : []
  const root = owners[0] ?? (legacyRoots.length === 1 ? legacyRoots[0] : undefined)
  const htmlId = owners[0]?.attribs["data-section-id"] ?? root?.attribs["data-id"]
  if (htmlId === "" || (htmlId && rendering.sectionId && htmlId !== rendering.sectionId)) return undefined
  // A persisted owner covers the complete rendering, including decorative
  // siblings. Only unstamped legacy HTML needs the exclusive-root check below.
  if (rendering.sectionId) return rendering.sectionId
  // A layout wrapper is fine; an owner on only one descendant must not claim
  // sibling text or another activity outside that section.
  let child: (typeof doc.children)[number] | typeof doc | undefined = root
  for (let ancestor = child?.parent; ancestor; ancestor = ancestor.parent) {
    if (ancestor.children.some((sibling) => sibling !== child && (
      (sibling.type === "text" && sibling.data.trim().length > 0) ||
      (sibling.type === "tag" && sibling.name !== "head")
    ))) return undefined
    child = ancestor
  }
  return htmlId
}

/** Read-only compatibility for develop's fixed-layout output. A positioned page
 * has exactly one fixed section and one rendering; unlike a reflowable page it
 * cannot have reordered section owners. Never infer ownership for other shapes
 * or override explicit (possibly contradictory) ownership evidence. */
function withLegacyFixedLayoutOwnership(
  storage: Storage, pageId: string, rendering: WebRenderingOutput,
): WebRenderingOutput {
  if (rendering.sections.length !== 1) return rendering
  const entry = rendering.sections[0]
  if (entry.sectionId || entry.html.includes("data-section-id")) return rendering
  const dedicated = storage.getLatestNodeData(FIXED_LAYOUT_SECTIONING_NODE, pageId)
  const fixed = PageSectioningOutputSchema.safeParse((dedicated ?? storage.getLatestNodeData(PAGE_SECTIONING_NODE, pageId))?.data)
  if (!fixed.success || fixed.data.sections.length !== 1) return rendering
  // v0.7.2/v0.7.3 wrote the positioned tree to page-sectioning. A generic
  // single semantic section does not prove ownership; require that producer's
  // fixed type and positioned sidecars when the dedicated node is absent.
  const section = fixed.data.sections[0]
  if (!dedicated && (section.sectionType !== "fixed-layout-page" || !section.viewport || !section.placement || entry.sectionType !== "fixed-layout-page")) return rendering
  const doc = parseDocument(entry.html)
  const roots = DomUtils.findAll((element) => element.type === "tag" && element.attribs.id === "content", doc.children)
  if (roots.length !== 1) return rendering
  const sectionId = fixed.data.sections[0].sectionId
  roots[0].attribs["data-section-id"] = sectionId
  return { ...rendering, sections: [{ ...entry, sectionId, html: DomUtils.getOuterHTML(doc) }] }
}

/** Read-only recovery from recorded identities, never current positions or
 * moved leaves. Custom-activity receipts name a precise historical rendering
 * version and the server-allocated owner. Only an unchanged unique rendering
 * in that version can inherit it. Missing logs do not authorize a guess. */
export function withLegacyRenderingOwnership(storage: Storage, pageId: string, rendering: WebRenderingOutput): WebRenderingOutput {
  const projected = withLegacyFixedLayoutOwnership(storage, pageId, rendering)
  const sections = getRenderSectioning(storage, pageId)?.sections
  const legacy = projected.sections.filter(entry => !entry.sectionId && !entry.html.includes("data-section-id"))
  if (!legacy.length) return projected
  const receipts = storage.getActivityCreationReceipts?.(pageId) ?? []
  const history = new Map((receipts.length ? storage.getAllNodeVersions("web-rendering", pageId) : []).map(row => [row.version, row.data]))
  // Exact string comparison avoids hashing embedded image/media data in HTML.
  const contentKey = (entry: SectionRendering) => JSON.stringify({ html: entry.html, sectionType: entry.sectionType, activityAnswers: entry.activityAnswers })
  const proven = new Map<string, Set<string>>()
  for (const receipt of receipts) {
    const snapshot = WebRenderingOutput.safeParse(history.get(receipt.version))
    if (!snapshot.success) continue
    const candidates = snapshot.data.sections.filter(entry => entry.sectionIndex === receipt.sectionIndex)
    if (candidates.length !== 1) continue
    const original = candidates[0]
    if (original.sectionId && original.sectionId !== receipt.sectionId) continue
    const key = contentKey(original)
    if (snapshot.data.sections.filter(entry => contentKey(entry) === key).length !== 1) continue
    const owners = proven.get(key) ?? new Set<string>()
    owners.add(receipt.sectionId)
    proven.set(key, owners)
  }
  const candidates = projected.sections.map(entry => {
    if (!legacy.includes(entry)) return { entry, id: renderedSectionId(entry), proven: true }
    const key = contentKey(entry)
    const owners = proven.get(key)
    // A server receipt outranks a model-authored root, even when that root
    // happens to name an existing section. Conflicting receipts forbid fallback.
    const id = owners
      ? (owners.size === 1 && projected.sections.filter(candidate => contentKey(candidate) === key).length === 1 ? [...owners][0] : undefined)
      : declaredSectionId(entry, true)
    return { entry, id, proven: !!owners }
  })
  return { ...projected, sections: candidates.map(candidate => {
    if (!legacy.includes(candidate.entry)) return candidate.entry
    const { id } = candidate
    if (!id || sections?.filter(section => section.sectionId === id).length !== 1) return candidate.entry
    const competing = candidates.filter(other => other !== candidate && other.id === id)
    if (competing.some(other => other.proven || !candidate.proven)) return candidate.entry
    return { ...candidate.entry, sectionId: id }
  }) }
}

export function resolveRenderedSection(
  rendering: SectionRendering,
  sections: readonly PageSectioningSection[] | undefined,
): PageSectioningSection | undefined {
  const id = renderedSectionId(rendering)
  if (!id) return undefined
  const matches = sections?.filter((section) => section.sectionId === id)
  return matches?.length === 1 ? matches[0] : undefined
}

/** Shared omission disclosure for preview, API and packaged output. */
export function renderingOwnershipWarnings(storage: Storage): PackagingWarning[] {
  return storage.getPages().flatMap((page) => {
    const rendering = WebRenderingOutput.safeParse(storage.getLatestNodeData("web-rendering", page.pageId)?.data)
    if (!rendering.success) return []
    const sections = getRenderSectioning(storage, page.pageId)?.sections
    return withLegacyRenderingOwnership(storage, page.pageId, rendering.data).sections.filter((entry) => !resolveRenderedSection(entry, sections))
      .map((entry) => ({ kind: "orphaned-rendering" as const, pageId: page.pageId, sectionIndex: entry.sectionIndex }))
  })
}

/**
 * The latest sectioning row a page is CURRENTLY rendered from: the positioned
 * `fixed-layout-sectioning` when present, else the semantic `page-sectioning`.
 * Returns the raw row so callers that need the version still have it.
 */
export function getRenderSectioningRow(
  storage: Storage,
  pageId: string,
): NodeDataRow | null {
  return getRenderSectioningSelection(storage, pageId)?.row ?? null
}

/** Versions are scoped to a node: switching source nodes can keep version 1. */
export function getRenderSectioningSelection(storage: Storage, pageId: string) {
  const fixed = storage.getLatestNodeData(FIXED_LAYOUT_SECTIONING_NODE, pageId)
  if (fixed) return { node: FIXED_LAYOUT_SECTIONING_NODE, row: fixed } as const
  const semantic = storage.getLatestNodeData(PAGE_SECTIONING_NODE, pageId)
  return semantic ? { node: PAGE_SECTIONING_NODE, row: semantic } as const : null
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
