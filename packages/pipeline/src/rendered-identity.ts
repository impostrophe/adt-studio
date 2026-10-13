import { parseDocument, DomUtils } from "htmlparser2"

// Activity grading keys use a separate, section-local namespace. Literal
// answers and accessible labels must never be treated as catalog references.
const identityAttributes = new Set([
  "data-id", "id", "for", "headers", "list", "form",
  "aria-activedescendant", "aria-controls", "aria-describedby", "aria-details",
  "aria-errormessage", "aria-flowto", "aria-labelledby", "aria-owns",
])

export function rewriteRenderedIdentityReferences(html: string, ids: Map<string, string>): string {
  const doc = parseDocument(html)
  for (const element of DomUtils.findAll((element) => element.type === "tag", doc.children)) {
    for (const [name, value] of Object.entries(element.attribs)) {
      if (element.name === "img" && name === "data-id") continue
      if (identityAttributes.has(name)) {
        element.attribs[name] = value.split(/(\s+)/).map((token) => ids.get(token) ?? token).join("")
      } else if (name === "href" && value.startsWith("#") && ids.has(value.slice(1))) {
        element.attribs[name] = `#${ids.get(value.slice(1))}`
      }
    }
  }
  return DomUtils.getOuterHTML(doc)
}

/** Rewrite structured identity attributes, independent of HTML quote style.
 * Images retain their shared asset identity; cloned text and activity leaves
 * absent from the sectioning tree receive fresh identities as well. */
export function cloneRenderedIdentities(html: string, ids: Map<string, string>, allocate: () => string): string {
  const doc = parseDocument(html)
  const elements = DomUtils.findAll((element) => element.type === "tag", doc.children)
  for (const element of elements) {
    const id = element.attribs["data-id"]
    if (id && element.name !== "img" && !ids.has(id)) ids.set(id, allocate())
  }
  return rewriteRenderedIdentityReferences(html, ids)
}

/** Caller must have established the owner before changing it (clone/merge).
 * An ownerless legacy fragment receives a single wrapper covering all content. */
export function stampRenderedOwner(html: string, sectionId: string): string {
  const doc = parseDocument(html)
  const owners = DomUtils.findAll((element) => element.type === "tag" && element.attribs["data-section-id"] !== undefined, doc.children)
  if (owners.length > 1) throw new Error("Rendering has multiple section owners")
  if (!owners.length) return `<section data-section-id="${sectionId}">${html}</section>`
  owners[0].attribs["data-section-id"] = sectionId
  return DomUtils.getOuterHTML(doc)
}
