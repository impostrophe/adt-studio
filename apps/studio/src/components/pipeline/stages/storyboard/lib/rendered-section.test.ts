// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PageDetail } from "@/api/client"
import { findRenderedSection } from "./rendered-section"
const rendering = { sections: [
  { sectionIndex: 1, html: '<section data-section-id="s9">nine</section>' },
  { sectionIndex: 0, html: '<section data-section-id="s2">two</section>' },
] } as NonNullable<PageDetail["rendering"]>

describe("editor rendering correspondence", () => {
  it("uses stable IDs for reordered and sparse renderings regardless of recycled indexes", () => {
    expect(findRenderedSection(rendering, "s9")?.html).toContain("nine")
    expect(findRenderedSection(rendering, "s2")?.html).toContain("two")
    expect(findRenderedSection(rendering, "retired")).toBeUndefined()
  })
  it("does not infer correspondence from a missing, nested or duplicate ID", () => {
    expect(findRenderedSection(rendering, undefined)).toBeUndefined()
    expect(findRenderedSection({ sections: [rendering.sections[0], rendering.sections[0]] }, "s9")).toBeUndefined()
    expect(findRenderedSection({ sections: [{ ...rendering.sections[0], html: "<section>Legacy</section>" }] }, "s9")).toBeUndefined()
    expect(findRenderedSection({ sections: [{ ...rendering.sections[0], html: '<section data-section-id="s9"><section data-section-id="s9">Nested</section></section>' }] }, "s9")).toBeUndefined()
  })
  it("permits the positioned page only with explicit fixed mode and a single fixed-layout rendering", () => {
    const fixed = { sections: [{ ...rendering.sections[0], sectionType: "fixed-layout-page" }] }
    expect(findRenderedSection(fixed, "semantic-id")).toBeUndefined()
    expect(findRenderedSection(fixed, "semantic-id", true)?.html).toContain("nine")
    expect(findRenderedSection(rendering, "s9", true)).toBeUndefined()
    expect(findRenderedSection({ sections: [fixed.sections[0], fixed.sections[0]] }, "semantic-id", true)).toBeUndefined()
  })
})
