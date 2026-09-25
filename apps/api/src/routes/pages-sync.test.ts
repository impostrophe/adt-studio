import { afterEach, beforeEach, describe, expect, it } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import crypto from "node:crypto"
import { Hono } from "hono"
import { createBookStorage, openBookDb } from "@adt/storage"
import type { PageSectioningOutput, SectioningSynchronization } from "@adt/types"
import { createPageRoutes } from "./pages.js"
import { errorHandler } from "../middleware/error-handler.js"

const label = "sync-book"
const pageId = "pg001"
const sectionId = "pg001_sec003"
const source: PageSectioningOutput = { reasoning: "fixture", sections: [{
  sectionId, sectionType: "text", backgroundColor: "#fff", textColor: "#000", pageNumber: 1, isPruned: false,
  nodes: [{ nodeId: "text-1", role: "text", text: "Old", isPruned: false }],
}] }
const rendering = { sections: [{ sectionIndex: 7, sectionType: "text", reasoning: "fixture", html: `<section data-section-id="${sectionId}" data-section-type="text"><p data-id="text-1">Old</p></section>` }] }
let dir: string
let config: string
const appFor = (root: string) => {
  const app = new Hono()
  app.onError(errorHandler)
  app.route("/api", createPageRoutes(root, root, root, config))
  return app
}
async function get(root = dir) {
  const response = await appFor(root).request(`/api/books/${label}/pages/${pageId}`)
  expect(response.status).toBe(200)
  return await response.json() as { sectioningSynchronization: SectioningSynchronization; rendering: unknown; versions: { sectioning: number; rendering: number } }
}
function write(fn: (storage: ReturnType<typeof createBookStorage>) => void) {
  const storage = createBookStorage(label, dir)
  try { fn(storage) } finally { storage.close() }
}
function snapshot(root = dir) {
  const dbPath = path.join(root, label, `${label}.db`)
  const db = openBookDb(dbPath)
  let tables: Record<string, unknown>
  try {
    const names = db.all("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []) as Array<{ name: string }>
    tables = Object.fromEntries(names.map(({ name }) => [name, db.all(`SELECT * FROM ${JSON.stringify(name)} ORDER BY rowid`, [])]))
  } finally { db.close() }
  const hashes: Record<string, string> = {}
  function walk(folder: string) {
    for (const name of fs.readdirSync(folder)) {
      const file = path.join(folder, name)
      if (fs.statSync(file).isDirectory()) walk(file)
      else hashes[path.relative(path.join(root, label), file)] = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")
    }
  }
  walk(path.join(root, label))
  return { tables, hashes }
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "sectioning-sync-"))
  config = path.join(dir, "config.yaml")
  fs.writeFileSync(config, "structure_types: {}\nrole_types: {}\n")
  write((storage) => {
    storage.putExtractedPage({ pageId, pageNumber: 1, text: "Text", pageImage: {
      imageId: "pg001_page", buffer: Buffer.from("original-image"), format: "png", hash: "hash", width: 800, height: 600,
    }, images: [] })
    storage.putNodeData("page-sectioning", pageId, source)
    storage.putNodeData("web-rendering", pageId, rendering)
    storage.putNodeData("text-catalog-translation", "fr", { manual: "kept" })
    storage.putNodeData("tts", "fr", { manual: "kept" })
    storage.putNodeData("web-rendering", "unrelated", { manual: "untouched" })
  })
  fs.mkdirSync(path.join(dir, label, "audio"), { recursive: true })
  fs.writeFileSync(path.join(dir, label, "audio", "manual.mp3"), "manual-audio")
})
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }))

describe("read-only synchronization projection", () => {
  it("reports unknown provenance even for matching legacy text and never writes any row/file", async () => {
    const before = snapshot()
    const first = await get()
    expect(first.sectioningSynchronization).toMatchObject({ sourceVersion: 1, renderingVersion: 1, layout: "reflowable", sections: [{ sectionId, status: "unknown-origin" }] })
    expect(first.rendering).toEqual(rendering)
    expect(await get()).toEqual(first) // fresh route/storage handles, as after restart
    expect(snapshot()).toEqual(before)
  })

  it("reads restored source/render pointers and preserves all historical versions", async () => {
    write((storage) => {
      const edited = structuredClone(source)
      edited.sections[0].nodes[0].text = "New"
      storage.putNodeData("page-sectioning", pageId, edited)
      storage.putNodeData("web-rendering", pageId, { sections: [] })
    })
    expect((await get()).sectioningSynchronization.sections[0].status).toBe("invalid-rendering")
    write((storage) => {
      storage.setCurrentNodeVersion("page-sectioning", pageId, 1)
      storage.setCurrentNodeVersion("web-rendering", pageId, 1)
    })
    const before = snapshot()
    const restored = await get()
    expect(restored.versions).toMatchObject({ sectioning: 1, rendering: 1 })
    expect(restored.sectioningSynchronization.sections[0].status).toBe("unknown-origin")
    expect(snapshot()).toEqual(before)
  })

  it("derives the same unresolved notice from a copied/imported book directory", async () => {
    const expected = (await get()).sectioningSynchronization
    const copied = path.join(dir, "imported")
    fs.mkdirSync(copied)
    fs.cpSync(path.join(dir, label), path.join(copied, label), { recursive: true })
    const before = snapshot(copied)
    expect((await get(copied)).sectioningSynchronization).toEqual(expected)
    expect(snapshot(copied)).toEqual(before)
  })

  it.each([null, { sections: [] }, { sections: "invalid legacy data" }])("reports absent/invalid rendering %j without rewriting it", async (value) => {
    write((storage) => storage.putNodeData("web-rendering", pageId, value))
    const before = snapshot()
    const body = await get()
    expect(body.sectioningSynchronization.sections).toMatchObject([{ sectionId, status: "invalid-rendering" }])
    expect(body.rendering).toEqual(value)
    expect(snapshot()).toEqual(before)
  })

  it("reports invalid legacy source instead of falsely claiming synchronization", async () => {
    write((storage) => storage.putNodeData("page-sectioning", pageId, { legacy: true }))
    const before = snapshot()
    expect((await get()).sectioningSynchronization.diagnostics).not.toHaveLength(0)
    expect(snapshot()).toEqual(before)
  })

  it("reports fixed-layout's semantic boundary while retaining the separate positioned tree", async () => {
    fs.writeFileSync(config, "structure_types: {}\nrole_types: {}\ndefault_render_strategy: fixed\nrender_strategies:\n  fixed:\n    render_type: fixed_layout\n")
    write((storage) => storage.putNodeData("fixed-layout-sectioning", pageId, { positioned: "original" }))
    const before = snapshot()
    expect((await get()).sectioningSynchronization).toMatchObject({ layout: "fixed", sections: [{ sectionId, status: "fixed-layout-unmapped" }] })
    expect(snapshot()).toEqual(before)
  })

  it("reports retired identity separately from a replacement at the same index", async () => {
    const replacement = structuredClone(source)
    replacement.sections[0].sectionId = "pg001_sec004"
    write((storage) => storage.putNodeData("page-sectioning", pageId, replacement))
    const result = (await get()).sectioningSynchronization
    expect(result.sections.map((s) => [s.sectionId, s.status])).toEqual([["pg001_sec004", "invalid-rendering"], [sectionId, "structural-drift"]])
  })

  it("does not treat missing configuration as proven reflowable mode", async () => {
    fs.writeFileSync(config, "malformed: [")
    const before = snapshot()
    expect((await get()).sectioningSynchronization).toMatchObject({ layout: "unknown", sections: [{ sectionId, status: "unknown-origin" }] })
    expect(snapshot()).toEqual(before)
  })
})
