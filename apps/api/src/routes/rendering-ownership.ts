import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { createBookStorage } from "@adt/storage"
import { RepairRenderingOwner, WebRenderingOutput, parseBookLabel, type RenderingOwnershipRepair, type ContentNodeData } from "@adt/types"
import { getRenderSectioningSelection, getRenderSectioning, withLegacyRenderingOwnership, resolveRenderedSection, renderingOwnerSignature, putSourceNodeData, reconcileTextCatalog } from "@adt/pipeline"
import { requireExistingBook } from "../utils/book-exists.js"

function snapshot(storage: ReturnType<typeof createBookStorage>, pageId: string) {
  const row = storage.getLatestNodeData("web-rendering", pageId)
  const source = getRenderSectioningSelection(storage, pageId)
  const sections = getRenderSectioning(storage, pageId)?.sections
  const rendering = WebRenderingOutput.safeParse(row?.data)
  if (!row || !source || !sections || !rendering.success) throw new HTTPException(409, { message: "Restore valid Sectioning and Storyboard versions before repairing ownership." })
  const projected = withLegacyRenderingOwnership(storage, pageId, rendering.data)
  const owners = new Set(projected.sections.flatMap(entry => {
    const owner = resolveRenderedSection(entry, sections)
    return owner ? [owner.sectionId] : []
  }))
  const text = (nodes: ContentNodeData[]): string => nodes.flatMap(node => [node.text ?? "", text(node.children ?? [])]).join(" ").trim()
  const review: RenderingOwnershipRepair = {
    renderingVersion: row.version, sectioningNode: source.node, sectioningVersion: source.row.version,
    unresolved: projected.sections.flatMap((entry, renderingIndex) => resolveRenderedSection(entry, sections) ? [] : [{ renderingIndex, rendering: rendering.data.sections[renderingIndex] }]),
    choices: sections.filter(section => !section.isPruned && !owners.has(section.sectionId) && sections.filter(other => other.sectionId === section.sectionId).length === 1)
      .map(section => ({ sectionId: section.sectionId, sectionType: section.sectionType, text: text(section.nodes) })),
  }
  return { row, source, sections, rendering: rendering.data, review }
}

export function createRenderingOwnershipRoutes(booksDir: string): Hono {
  const app = new Hono()
  const route = "/books/:label/pages/:pageId/rendering-ownership"
  app.get(route, c => {
    const label = parseBookLabel(c.req.param("label"))
    requireExistingBook(label, booksDir)
    const storage = createBookStorage(label, booksDir)
    try { return c.json(storage.readSnapshot(() => snapshot(storage, c.req.param("pageId")).review)) }
    finally { storage.close() }
  })
  // The application bookWriterMiddleware admits this write using the same
  // lease as edits, queued workers and generation. No second locking scheme.
  app.post(route, async c => {
    const label = parseBookLabel(c.req.param("label"))
    requireExistingBook(label, booksDir)
    const request = RepairRenderingOwner.safeParse(await c.req.json())
    if (!request.success) throw new HTTPException(400, { message: "Invalid ownership repair" })
    const storage = createBookStorage(label, booksDir)
    try {
      return c.json(storage.transaction(() => {
        const pageId = c.req.param("pageId")
        const current = snapshot(storage, pageId)
        const { renderingVersion, sectioningNode, sectioningVersion, renderingIndex, sectionId } = request.data
        if (current.row.version !== renderingVersion || current.source.node !== sectioningNode || current.source.row.version !== sectioningVersion) throw new HTTPException(409, { message: "Content changed during ownership review. Reload and review the retained content again." })
        if (!current.review.unresolved.some(entry => entry.renderingIndex === renderingIndex) || !current.review.choices.some(choice => choice.sectionId === sectionId)) throw new HTTPException(409, { message: "This rendering or section is no longer available for ownership repair." })
        const entry = { ...current.rendering.sections[renderingIndex], sectionId, sectionIndex: current.sections.findIndex(section => section.sectionId === sectionId) }
        // Preserve scripts and their selectors verbatim, including contradictory
        // old owner attributes. Explicit review binds the entire stored entry.
        entry.ownerReview = { signature: renderingOwnerSignature(entry), renderingVersion, sectioningNode, sectioningVersion }
        const next = { ...current.rendering, sections: current.rendering.sections.map((old, index) => index === renderingIndex ? entry : old) }
        const version = putSourceNodeData(storage, "web-rendering", pageId, next)
        reconcileTextCatalog(storage)
        storage.clearNodesByType(["accessibility-assessment"])
        return { version }
      }))
    } finally { storage.close() }
  })
  return app
}
