import { DomUtils, parseDocument } from "htmlparser2"
import { PageSectioningOutput, SOURCE_GENERATION_RESET_STEPS, WebRenderingOutput } from "@adt/types"
import type { Storage } from "@adt/storage"
import { inputSignature } from "./output-freshness.js"
import { renderedSectionId } from "./render-sectioning.js"

/** Semantic inputs only: no CSS, placement, reasoning, media bytes or URLs.
 * These generators retain their existing coarse source-change policy; their
 * content is deliberately not part of catalog-based replacement. */
export function sourceGenerationBasis(node: string, data: unknown): unknown {
  if (node === "page-sectioning" || node === "fixed-layout-sectioning") {
    const parsed = PageSectioningOutput.safeParse(data)
    return parsed.success ? parsed.data.sections.map((section) => ({
      sectionId: section.sectionId, sectionType: section.sectionType,
      pageNumber: section.pageNumber, isPruned: section.isPruned,
      nodes: section.nodes, sourcePageIds: section.sourcePageIds,
    })) : null
  }
  if (node !== "web-rendering") return null
  const parsed = WebRenderingOutput.safeParse(data)
  if (!parsed.success) return null
  return parsed.data.sections.map((section) => {
    const doc = parseDocument(section.html)
    for (const element of DomUtils.findAll((element) => ["style", "script", "head"].includes(element.name), doc.children)) DomUtils.removeElement(element)
    const owners = DomUtils.findAll((element) => element.attribs["data-section-id"] !== undefined, doc.children)
    const sectionId = renderedSectionId(section)
    // Stamping an already-proven owner adds no source input. Keep conflicting
    // or multiple owner declarations visible; never infer ownership by index.
    const extraOwner = (element: (typeof owners)[number]) => {
      const owner = element.attribs["data-section-id"]
      return sectionId && owners.length === 1 && owner === sectionId ? undefined : owner
    }
    const identities = DomUtils.findAll((element) => !!element.attribs["data-id"] || extraOwner(element) !== undefined || /^h[1-6]$/.test(element.name) || element.name === "img", doc.children)
      .map((element) => ({ id: element.attribs["data-id"], owner: extraOwner(element),
        // Moving text between stable IDs is a source edit even when the
        // concatenated section text stays identical.
        text: DomUtils.textContent(element).replace(/\s+/g, " ").trim(),
        role: element.attribs["data-role"] ?? element.attribs.role,
        heading: /^h[1-6]$/.test(element.name) ? element.name : undefined,
        image: element.name === "img", alt: element.name === "img" ? element.attribs.alt : undefined }))
    return { sectionId, sectionType: section.sectionType,
      text: DomUtils.textContent(doc).replace(/\s+/g, " ").trim(), identities,
      activityAnswers: section.activityAnswers }
  })
}

export function resetSourceGenerationAttempts(storage: Storage, node: string, before: unknown, after: unknown): void {
  if (inputSignature(sourceGenerationBasis(node, before)) !== inputSignature(sourceGenerationBasis(node, after))) {
    storage.clearStepRuns([...SOURCE_GENERATION_RESET_STEPS])
  }
}

/** Publish source and reset only the separate source generators atomically.
 * Catalog-managed attempts, entity versions and physical assets are retained. */
export function putSourceNodeData(storage: Storage, node: string, itemId: string, data: unknown): number {
  return storage.transaction(() => {
    const previous = storage.getLatestNodeData(node, itemId)?.data
    const version = storage.putNodeData(node, itemId, data)
    resetSourceGenerationAttempts(storage, node, previous, data)
    return version
  })
}
