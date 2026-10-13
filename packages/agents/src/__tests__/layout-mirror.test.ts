import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { createBookStorage, type Storage } from "@adt/storage"
import { SOURCE_GENERATION_RESET_STEPS } from "@adt/types"
const { generateObject } = vi.hoisted(() => ({ generateObject: vi.fn() }))
vi.mock("@adt/llm", () => ({ createLLMModel: () => ({ generateObject }) }))
import { mirrorLayout } from "../layout-mirror.js"
let root: string
let db: Storage
const owner = "pg001_sec001"
const html = `<section data-section-id="${owner}"><p data-id="pg001_t001">First</p><p data-id="pg001_t002">Second</p><p data-id="pg001_t003">Third</p><p data-id="pg001_t004">Fourth</p></section>`
const rendering = { sections: [{ sectionId: owner, sectionIndex: 0, sectionType: "text", reasoning: "fixture", html }] }
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "adt-mirror-attempts-"))
  db = createBookStorage("book", root)
  // Native Sectioning is not already flattened by the agent's HTML builder.
  db.putNodeData("page-sectioning", "pg001", { reasoning: "fixture", sections: [{
    sectionId: owner, sectionType: "text", backgroundColor: "white", textColor: "black", pageNumber: 1, isPruned: false,
    nodes: ["First", "Second", "Third", "Fourth"].map((text, index) => ({ nodeId: `pg001_t00${index + 1}`, role: "text", text, isPruned: false })),
  }] })
  db.putNodeData("web-rendering", "pg001", rendering)
  for (const step of [...SOURCE_GENERATION_RESET_STEPS, "tts", "catalog-translation"]) db.markStepCompleted(step)
  for (const node of ["glossary", "quiz-generation", "toc-generation"]) db.putNodeData(node, "book", { manual: "retained" })
  generateObject.mockReset()
})
afterEach(() => { db.close(); fs.rmSync(root, { recursive: true, force: true }) })
it.each(["cosmetic", "substantive", "conflict", "failure"])("handles %s mirroring without deleting content or resetting unrelated attempts", async (mode) => {
  generateObject.mockImplementation(async () => {
    if (mode === "failure") throw new Error("provider failed")
    if (mode === "conflict") db.putNodeData("web-rendering", "pg001", rendering)
    return { object: { reasoning: "mirror", content: mode === "cosmetic" ? html.replace("<section ", '<section style="color:red" ') : html.replace('<p data-id="pg001_t004">Fourth</p>', "") } }
  })
  const result = await mirrorLayout({ storage: db, bookLabel: "book", booksDir: root, source: { pageId: "pg001", sectionIndex: 0 }, targets: [{ pageId: "pg001", sectionIndex: 0 }], modelId: "fixture" })
  expect(result.results[0].ok).toBe(mode === "cosmetic" || mode === "substantive")
  const steps = db.getStepRuns().map((run) => run.step)
  for (const step of SOURCE_GENERATION_RESET_STEPS) expect(steps.includes(step)).toBe(mode !== "substantive")
  expect(steps).toEqual(expect.arrayContaining(["tts", "catalog-translation"]))
  for (const node of ["glossary", "quiz-generation", "toc-generation"]) expect(db.getAllNodeVersions(node, "book").map((row) => row.data)).toEqual([{ manual: "retained" }])
  expect(db.getAllNodeVersions("web-rendering", "pg001")[0].data).toEqual(rendering)
})
