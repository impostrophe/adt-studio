import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, expect, it } from "vitest"
import { createBookStorage, type Storage } from "@adt/storage"
import { SOURCE_GENERATION_RESET_STEPS } from "@adt/types"
import { putSourceNodeData, resetSourceGenerationAttempts } from "../source-generation-state.js"

let root: string
let db: Storage
const section = { sectionId: "pg001_sec001", sectionType: "content", backgroundColor: "white", textColor: "black", pageNumber: 1, isPruned: false,
  nodes: [{ nodeId: "pg001_t001", isPruned: false, role: "heading", text: "Hello", headingLevel: 1 }] }
const sectioning = { reasoning: "fixture", sections: [section] }
const rendering = { sections: [{ sectionIndex: 0, sectionId: section.sectionId, sectionType: "content", reasoning: "fixture",
  html: '<div data-section-id="pg001_sec001"><h1 data-id="pg001_t001">Hello</h1><img data-id="pg001_im001" alt="Tree"></div>' }] }
const catalogSteps = ["image-captioning", "easy-read", "catalog-translation", "core-tts-catalog", "tts", "word-timestamps", "package-web"]
function markAttempts() { for (const step of [...SOURCE_GENERATION_RESET_STEPS, ...catalogSteps]) db.markStepCompleted(step) }
function assertReset(reset: boolean) {
  const steps = db.getStepRuns().map((run) => run.step)
  for (const step of SOURCE_GENERATION_RESET_STEPS) expect(steps.includes(step), step).toBe(!reset)
  for (const step of catalogSteps) expect(steps).toContain(step)
  for (const node of ["glossary", "quiz-generation", "toc-generation", "tts"]) expect(db.getAllNodeVersions(node, "book").map((row) => row.data)).toEqual([{ manual: "older" }, { manual: "latest" }])
  expect(fs.readFileSync(path.join(db.bookDir!, "retained.wav"), "utf8")).toBe("historical physical audio")
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "adt-source-attempts-"))
  db = createBookStorage("book", root)
  db.putNodeData("page-sectioning", "pg001", sectioning)
  db.putNodeData("web-rendering", "pg001", rendering)
  for (const node of ["glossary", "quiz-generation", "toc-generation", "tts"]) {
    db.putNodeData(node, "book", { manual: "older" }); db.putNodeData(node, "book", { manual: "latest" })
  }
  fs.writeFileSync(path.join(db.bookDir!, "retained.wav"), "historical physical audio")
  markAttempts()
})
afterEach(() => { db.close(); fs.rmSync(root, { recursive: true, force: true }) })

it("keeps completed attempts for palette, placement, CSS, reasoning and unchanged saves", () => {
  putSourceNodeData(db, "page-sectioning", "pg001", { ...sectioning, reasoning: "new reasoning", sections: [{ ...section, backgroundColor: "red", textColor: "blue", placement: {}, viewport: { width: 10, height: 20 } }] })
  putSourceNodeData(db, "web-rendering", "pg001", { sections: [{ ...rendering.sections[0], reasoning: "new reasoning", html: rendering.sections[0].html.replace('<h1 ', '<h1 style="color:red; margin:10px" ').replace('<img ', '<img width="200" height="100" ') }] })
  assertReset(false)
})
it.each(["text", "role", "heading", "prune", "clone", "delete", "order", "image"])("resets source attempts for %s while retaining all content, versions and files", (change) => {
  const next = structuredClone(sectioning)
  if (change === "text") next.sections[0].nodes[0].text = "Changed"
  if (change === "role") next.sections[0].nodes[0].role = "text"
  if (change === "heading") next.sections[0].nodes[0].headingLevel = 2
  if (change === "prune") next.sections[0].isPruned = true
  if (change === "clone") next.sections.push({ ...section, sectionId: "pg001_sec002" })
  if (change === "delete") next.sections = []
  if (change === "order") { next.sections[0].nodes.push({ ...section.nodes[0], nodeId: "pg001_t002", text: "Second" }); db.putNodeData("page-sectioning", "pg001", next); next.sections[0].nodes.reverse() }
  if (change === "image") next.sections[0].nodes.push({ nodeId: "pg001_im002", role: "image", text: "", isPruned: false, headingLevel: 1 })
  putSourceNodeData(db, "page-sectioning", "pg001", next)
  assertReset(true)
})
it("resets on rendered source changes and restores, but ignores downstream restores", () => {
  const next = { sections: [{ ...rendering.sections[0], html: rendering.sections[0].html.replace("Hello", "Different") }] }
  putSourceNodeData(db, "web-rendering", "pg001", next)
  assertReset(true)
  markAttempts()
  db.transaction(() => { db.setCurrentNodeVersion("web-rendering", "pg001", 1); resetSourceGenerationAttempts(db, "web-rendering", next, rendering) })
  assertReset(true)
  markAttempts()
  resetSourceGenerationAttempts(db, "text-catalog-translation", { text: "Before" }, { text: "After" })
  assertReset(false)
})
it("rolls source writes and resets back together when publication is rejected", () => {
  expect(() => db.transaction(() => {
    putSourceNodeData(db, "page-sectioning", "pg001", { ...sectioning, sections: [] })
    throw new Error("conflict")
  })).toThrow("conflict")
  expect(db.getLatestNodeData("page-sectioning", "pg001")?.version).toBe(1)
  assertReset(false)
})

it("resets when text moves between stable IDs even if aggregate text and ID order are unchanged", () => {
  const original = { sections: [{ ...rendering.sections[0], html: '<p data-id="one">One</p><p data-id="two">Two</p>' }] }
  db.putNodeData("web-rendering", "pg001", original)
  putSourceNodeData(db, "web-rendering", "pg001", { sections: [{ ...original.sections[0], html: '<p data-id="one">OneT</p><p data-id="two">wo</p>' }] })
  assertReset(true)
})
