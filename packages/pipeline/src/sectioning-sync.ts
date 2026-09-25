import { DomUtils, Parser, parseDocument } from "htmlparser2"
import type {
  ContentNodeData, PageSectioningSection, SectionSyncResult,
  SectioningSyncCandidate, SectioningSyncInput,
} from "@adt/types"
import { collectOptionalTextIds } from "./render-llm.js"

// Adapted from PR #581 (Kemal Sokolovic, 8d077980): pure classification and
// optional-text handling. Stored HTML is deliberately NOT passed through the
// generation validator: its normalization can rewrite layout/custom content.
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
])

function inspectHtml(html: string) {
  let malformed = false
  const parser = new Parser({
    onclosetag(name, implied) {
      if (implied && !VOID_TAGS.has(name)) malformed = true
    },
  })
  parser.end(html)
  const doc = parseDocument(html, { withStartIndices: true, withEndIndices: true })
  const sections = DomUtils.getElementsByTagName("section", doc.children, true)
  return { doc, sections, malformed }
}

function activeNodes(nodes: ContentNodeData[]): ContentNodeData[] {
  return nodes.filter((node) => !node.isPruned).flatMap((node) => [
    node, ...activeNodes(node.children ?? []),
  ])
}

/** Exact structure comparison: text is the ONLY permitted changing field. */
function structure(section: PageSectioningSection): string {
  const withoutText = (nodes: ContentNodeData[]): unknown => nodes.map(({ text: _text, children, ...node }) => ({
    ...node, ...(children ? { children: withoutText(children) } : {}),
  }))
  const { nodes, ...rest } = section
  return JSON.stringify({ ...rest, nodes: withoutText(nodes) })
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Preserve the renderer's blank markers only with an exact, unique mapping. */
function projectText(before: string, after: string, rendered: string): string | null {
  if (rendered === before) return after
  const blanks = /(\[placeholder:[^\]]+\]|_{3,}|\.{3,})/g
  const previous = before.split(blanks)
  const proposed = after.split(blanks)
  const actual = rendered.split(/(\[\[blank:item-\d+(?::[^\]]+)?\]\])/g)
  if (previous.length < 3 || previous.length !== proposed.length || previous.length !== actual.length) return null
  for (let i = 0; i < previous.length; i++) {
    if (i % 2 === 0 ? previous[i] !== actual[i] : previous[i] !== proposed[i]) return null
  }
  return proposed.map((part, i) => i % 2 ? actual[i] : part).join("")
}

function patchSection(before: PageSectioningSection, after: PageSectioningSection, html: string) {
  const parsed = inspectHtml(html)
  const fail = (status: SectionSyncResult["status"], diagnostic: string) => ({ status, diagnostics: [diagnostic], html })
  if (parsed.malformed || parsed.sections.length !== 1) {
    return fail("invalid-rendering", "Rendering must contain exactly one explicitly closed section.")
  }
  const root = parsed.sections[0]
  if (root.attribs["data-section-id"] !== after.sectionId || root.attribs["data-section-type"] !== after.sectionType) {
    return fail("invalid-rendering", "Rendered section identity or type does not match the source.")
  }
  if (structure(before) !== structure(after)) return fail("structural-drift", "The source structure changed.")
  const nodes = activeNodes(before.nodes)
  const ids = new Set(nodes.map((node) => node.nodeId))
  if (ids.size !== nodes.length) return fail("structural-drift", "Source node identities are not unique.")
  const elements = DomUtils.getElementsByTagName("*", root.children, true)
  const byId = new Map<string, typeof elements>()
  for (const element of elements) {
    const id = element.attribs["data-id"]
    if (!id) continue
    const matches = byId.get(id) ?? []
    matches.push(element)
    byId.set(id, matches)
    if (matches.length !== 1) return fail("invalid-rendering", `Duplicate rendered node: ${id}`)
    if (!ids.has(id) && !id.startsWith("activity_gen_")) return fail("structural-drift", `Unknown rendered node: ${id}`)
  }
  const optional = collectOptionalTextIds(nodes.filter((n) => n.role && n.role !== "image").map((n) => ({
    text_id: n.nodeId, text_type: n.role!, text: n.text ?? "",
  })))
  const nextNodes = new Map(activeNodes(after.nodes).map((node) => [node.nodeId, node]))
  const replacements: Array<{ start: number; end: number; text: string }> = []
  for (const node of nodes) {
    if (!node.role) continue // Containers are preserved, never flattened.
    const element = byId.get(node.nodeId)?.[0]
    const next = nextNodes.get(node.nodeId)!
    if (!element) {
      if (optional.has(node.nodeId) && node.text === next.text) continue
      return fail("structural-drift", `Missing rendered node: ${node.nodeId}`)
    }
    if (node.role === "image") {
      if (element.name !== "img") return fail("structural-drift", `Image identity is not on an image: ${node.nodeId}`)
      continue // Never rewrite src or any other image attribute.
    }
    if (element.children.length !== 1 || element.children[0].type !== "text") {
      return fail("structural-drift", `Text projection contains unsupported markup: ${node.nodeId}`)
    }
    if (["script", "style", "textarea", "title"].includes(element.name)) return fail("structural-drift", `Text projection is not ordinary display text: ${node.nodeId}`)
    const textNode = element.children[0]
    const projected = projectText(node.text ?? "", next.text ?? "", textNode.data)
    if (projected === null) return fail("protected-divergence", `Rendered text differs from the recorded source: ${node.nodeId}`)
    if (projected === textNode.data) continue
    if (textNode.startIndex === null || textNode.endIndex === null) return fail("invalid-rendering", "Text has no source location.")
    replacements.push({ start: textNode.startIndex, end: textNode.endIndex + 1, text: escapeText(projected) })
  }
  let candidate = html
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    candidate = candidate.slice(0, replacement.start) + replacement.text + candidate.slice(replacement.end)
  }
  return { status: candidate === html ? "current" as const : "text-patched" as const, diagnostics: [], html: candidate }
}

/**
 * Pure three-way classifier. It never writes, normalizes a document, executes
 * scripts or calls a provider. The caller must validate/recheck versions and
 * obtain shared writer admission before committing any returned candidate.
 */
export function classifySectioningSynchronization(input: SectioningSyncInput): SectioningSyncCandidate {
  const { source, priorSource, rendering } = input
  const sections: SectionSyncResult[] = []
  const diagnostics: string[] = []
  const parsed = (rendering?.sections ?? []).map((stored) => ({ stored, ...inspectHtml(stored.html) }))
  const active = source.sections.filter((section) => !section.isPruned)
  const activeIds = new Set(active.map((section) => section.sectionId))
  const nextRenderings = [...(rendering?.sections ?? [])]
  let changed = false
  for (const section of active) {
    const add = (status: SectionSyncResult["status"], diagnostic: string) => sections.push({ sectionId: section.sectionId, status, diagnostics: [diagnostic] })
    if (input.layout === "fixed") {
      add("fixed-layout-unmapped", "Semantic text does not update the positioned page.")
      continue
    }
    const owners = input.sectionOwners[section.sectionId] ?? []
    if (input.layout === "unknown" || owners.length !== 1 || owners[0] !== input.pageId || active.filter((s) => s.sectionId === section.sectionId).length !== 1) {
      add("unknown-origin", "Layout or unique page ownership cannot be verified.")
      continue
    }
    const matches = parsed.filter((entry) => entry.sections.some((el) => el.attribs["data-section-id"] === section.sectionId))
    if (matches.length === 0) {
      // Identityless legacy output must never be assigned by sectionIndex.
      const ambiguous = parsed.some((entry) => entry.sections.length === 0 || entry.sections.some((el) => !el.attribs["data-section-id"]))
      add(ambiguous ? "unknown-origin" : "invalid-rendering", ambiguous ? "Rendering has no proven stable identity." : "No rendering exists for this section.")
      continue
    }
    if (matches.length !== 1 || matches[0].malformed || matches[0].sections.length !== 1) {
      add("invalid-rendering", "Rendering has malformed or duplicate section correspondence.")
      continue
    }
    const proof = input.proofs.filter((p) => p.sectionId === section.sectionId)
    const previous = priorSource?.sections.filter((s) => s.sectionId === section.sectionId && !s.isPruned)
    if (proof.length !== 1 || proof[0].pageId !== input.pageId || proof[0].sourceVersion !== input.sourceVersion || proof[0].renderingVersion !== input.renderingVersion || !previous || previous.length !== 1 || proof[0].origin === "unknown") {
      add("unknown-origin", "The source and protection provenance of this rendering is unverified.")
      continue
    }
    if (proof[0].origin === "manual") {
      add("protected-divergence", "This rendering is protected and requires explicit review.")
      continue
    }
    const entry = matches[0]
    const outcome = patchSection(previous[0], section, entry.stored.html)
    sections.push({ sectionId: section.sectionId, status: outcome.status, diagnostics: outcome.diagnostics })
    if (outcome.html !== entry.stored.html) {
      nextRenderings[parsed.indexOf(entry)] = { ...entry.stored, html: outcome.html }
      changed = true
    }
  }
  // Retired identities are reported by their own id, never a successor's index.
  for (const entry of parsed) {
    for (const element of entry.sections) {
      const id = element.attribs["data-section-id"]
      if (id && !activeIds.has(id)) sections.push({ sectionId: id, status: "structural-drift", diagnostics: ["Rendered identity is not active on this page."] })
    }
    if (entry.sections.length === 0 || entry.sections.some((el) => !el.attribs["data-section-id"])) diagnostics.push("A rendering has no proven stable section identity.")
  }
  return { rendering: changed && rendering ? { ...rendering, sections: nextRenderings } : rendering, changed, sections, diagnostics }
}
