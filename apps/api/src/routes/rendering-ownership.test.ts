import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Hono } from "hono"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { createBookStorage, withBookWriter } from "@adt/storage"
import { buildTextCatalogSnapshot, renderingOwnershipWarnings, resolveReadingOrder, packageAdtWeb, loadBookConfig } from "@adt/pipeline"
import { RenderingOwnershipRepair, WebRenderingOutput } from "@adt/types"
import { createPageRoutes } from "./pages.js"
import { createAdtPreviewRoutes } from "./adt-preview.js"
import { bookWriterMiddleware } from "../middleware/book-writer.js"
import { errorHandler } from "../middleware/error-handler.js"

let root: string
let app: Hono
const label = "repair"
const endpoint = `/books/${label}/pages/pg001/rendering-ownership`
const storage = () => createBookStorage(label, root)
const oldHtml = '<section data-section-id="wrong"><p data-id="question">Retained custom question</p><script>window.original = "wrong";</script></section>'
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ownership-repair-"))
  const db = storage()
  db.putExtractedPage({ pageId: "pg001", pageNumber: 1, text: "", pageImage: { imageId: "pg001_page", buffer: Buffer.from("page"), format: "png", hash: "page", width: 10, height: 10 }, images: [] })
  db.putNodeData("metadata", "book", { language_code: "en" })
  db.putNodeData("page-sectioning", "pg001", { reasoning: "", sections: [{ sectionId: "pg001_sec001", sectionType: "activity_custom_test", backgroundColor: "white", textColor: "black", pageNumber: 1, isPruned: false, nodes: [{ nodeId: "question", role: "body_text", text: "Retained custom question", isPruned: false }] }] })
  db.putNodeData("web-rendering", "pg001", { sections: [{ sectionId: "conflict", sectionIndex: 0, sectionType: "activity_custom_test", reasoning: "retained", html: oldHtml, activityAnswers: { answer: "Original answer" } }] })
  db.putNodeData("text-catalog-translation", "fr", { entries: [{ id: "question", text: "Correction conservée", source: "manual" }], generatedAt: "old" })
  fs.writeFileSync(path.join(db.bookDir!, "config.yaml"), "editing_language: en\noutput_languages: [en]\n")
  db.close()
  app = new Hono().onError(errorHandler).use("/books/:label/*", bookWriterMiddleware(root)).route("/", createPageRoutes(root, path.resolve("prompts"), path.resolve("assets")))
})
afterEach(() => { vi.unstubAllGlobals(); fs.rmSync(root, { recursive: true, force: true }) })
const read = async () => RenderingOwnershipRepair.parse(await (await app.request(endpoint)).json())
const link = (review: RenderingOwnershipRepair, sectionId = "pg001_sec001") => app.request(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ renderingVersion: review.renderingVersion, sectioningNode: review.sectioningNode, sectioningVersion: review.sectioningVersion, renderingIndex: 0, sectionId }) })

it("explicit repair preserves HTML/answers/history and makes contradictory legacy output usable without providers", async () => {
  const transport = vi.fn(() => { throw new Error("Repair must not call providers") }); vi.stubGlobal("fetch", transport)
  const before = storage()
  const raw = before.getAllNodeVersions("web-rendering", "pg001")
  const corrections = before.getLatestNodeData("text-catalog-translation", "fr")
  before.close()
  const review = await read()
  expect(review.unresolved[0].rendering.html).toBe(oldHtml)
  expect(review.choices.map(choice => choice.sectionId)).toEqual(["pg001_sec001"])
  const untouched = storage(); expect(untouched.getAllNodeVersions("web-rendering", "pg001")).toEqual(raw); untouched.close()
  expect((await link(review)).status).toBe(200)
  expect((await link(review)).status).toBe(409)
  const db = storage()
  const next = WebRenderingOutput.parse(db.getLatestNodeData("web-rendering", "pg001")?.data)
  expect(next.sections[0]).toMatchObject({ html: oldHtml, sectionId: "pg001_sec001", activityAnswers: { answer: "Original answer" } })
  expect(db.getAllNodeVersions("web-rendering", "pg001")[0]).toEqual(raw[0])
  expect(db.getLatestNodeData("text-catalog-translation", "fr")).toEqual(corrections)
  expect(renderingOwnershipWarnings(db)).toEqual([])
  expect(resolveReadingOrder(db).items.map(item => item.id)).toEqual(["pg001_sec001"])
  expect(buildTextCatalogSnapshot(db, db.getPages()).entries.find(entry => entry.id === "pg001_sec001_ans_answer")?.text).toBe("Original answer")
  await packageAdtWeb(db, { bookDir: db.bookDir!, label, language: "en", outputLanguages: ["en"], title: "Repaired", webAssetsDir: path.resolve("assets/adt"), config: loadBookConfig(label, root), promptsDir: path.resolve("prompts"), configDir: path.resolve("config") })
  expect(fs.readFileSync(path.join(db.bookDir!, "adt/pg001_sec001.html"), "utf8")).toContain('window.original = "wrong";')
  db.close()
  const preview = await createAdtPreviewRoutes(root, path.resolve("assets/adt")).request(`/books/${label}/adt-preview/pg001_sec001.html`)
  expect(preview.status).toBe(200)
  expect(await preview.text()).toContain("Retained custom question")
  expect(transport).not.toHaveBeenCalled()
  // Recovery is a versioned choice, not destructive migration.
  const restored = storage(); restored.setCurrentNodeVersion("web-rendering", "pg001", raw[0].version); expect(renderingOwnershipWarnings(restored)).toHaveLength(1); restored.close()
})

it.each(["web-rendering", "page-sectioning"])("rejects changed %s during review with no repair write", async node => {
  const review = await read()
  const db = storage(); db.putNodeData(node, "pg001", db.getLatestNodeData(node, "pg001")!.data)
  const history = db.getAllNodeVersions("web-rendering", "pg001"); db.close()
  expect((await link(review)).status).toBe(409)
  const after = storage(); expect(after.getAllNodeVersions("web-rendering", "pg001")).toEqual(history); after.close()
})

it("rejects absent owners and concurrent writers without changing retained content", async () => {
  const review = await read()
  expect((await link(review, "foreign" )).status).toBe(409)
  let release!: () => void
  const writer = withBookWriter(path.join(root, label), () => new Promise<void>(resolve => { release = resolve }))
  try { expect((await link(review)).status).toBe(409) } finally { release(); await writer }
  const db = storage(); expect(db.getAllNodeVersions("web-rendering", "pg001")).toHaveLength(1); db.close()
})


it("rejects a changed source node even when its numeric version matches the reviewed source", async () => {
  const review = await read()
  const db = storage()
  db.putNodeData("fixed-layout-sectioning", "pg001", db.getLatestNodeData("page-sectioning", "pg001")!.data)
  db.close()
  expect((await link(review)).status).toBe(409)
  const after = storage(); expect(after.getAllNodeVersions("web-rendering", "pg001")).toHaveLength(1); after.close()
})
