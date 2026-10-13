import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { createBookStorage } from "@adt/storage"
import { buildTextCatalogSnapshot, buildImageInventory, buildEasyReadSourceBlocks, resolveReadingOrder, packageAdtWeb, loadBookConfig, renderingOwnershipWarnings } from "@adt/pipeline"
import type { PageSectioningOutput, WebRenderingOutput } from "@adt/types"
import { createPageRoutes } from "./pages.js"
import { createAdtPreviewRoutes } from "./adt-preview.js"
import { createBookTools } from "@adt/agents"
import { createOutputRoutes } from "./outputs.js"

let root: string
const label = "ownership"
const storage = () => createBookStorage(label, root)
const sections: PageSectioningOutput = { reasoning: "", sections: ["A", "B"].map((id) => ({ sectionId: id, sectionType: "activity_fill_in_the_blank", backgroundColor: "white", textColor: "black", pageNumber: 1, isPruned: false, nodes: [{ nodeId: `text-${id}`, role: "body_text", text: `Question ${id}`, isPruned: false }] })) }
const rendering: WebRenderingOutput = { sections: ["A", "B"].map((id, i) => ({ sectionIndex: i, sectionType: "activity_fill_in_the_blank", reasoning: "", html: `<section data-section-id="${id}"><p data-id="text-${id}">Question ${id}</p><img data-id="image-${id}"/><input data-activity-item="item-1"/></section>`, activityAnswers: { "item-1": i === 0 ? "sun" : "moon" } })) }
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "adt-rendered-ownership-"))
  const db = storage()
  db.putExtractedPage({ pageId: "pg001", pageNumber: 1, text: "", pageImage: { imageId: "pg001_page", buffer: Buffer.from("page"), format: "png", hash: "page", width: 100, height: 100 }, images: [] })
  db.putNodeData("metadata", "book", { language_code: "en" })
  db.putNodeData("page-sectioning", "pg001", sections)
  db.putNodeData("web-rendering", "pg001", rendering)
  db.putNodeData("text-catalog-translation", "fr", { entries: [{ id: "A_ans_item-1", text: "Manuel Soleil", source: "manual" }, { id: "B_ans_item-1", text: "Manuel Lune", source: "manual" }], generatedAt: "before" })
  fs.writeFileSync(path.join(db.bookDir!, "config.yaml"), "editing_language: en\noutput_languages: [en, fr]\n")
  db.close()
})
afterEach(() => { vi.unstubAllGlobals(); fs.rmSync(root, { recursive: true, force: true }) })
const answerMap = () => { const db = storage(); try { return Object.fromEntries(buildTextCatalogSnapshot(db, db.getPages()).entries.filter((entry) => entry.id.includes("_ans_")).map((entry) => [entry.id, entry.text])) } finally { db.close() } }

it("AC-4/9 keeps answers, contexts, images and packaged corrections with their owner across source reorder, prune and restore", async () => {
  const app = createPageRoutes(root, path.resolve("prompts"), path.resolve("assets"))
  const before = storage(); const corrections = before.getLatestNodeData("text-catalog-translation", "fr"); const raw = before.getLatestNodeData("web-rendering", "pg001"); before.close()
  const provider = vi.fn(() => { throw new Error("Save must not generate") }); vi.stubGlobal("fetch", provider)
  const reordered = { ...sections, sections: [...sections.sections].reverse() }
  const response = await app.request(`/books/${label}/pages/pg001/sectioning`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reordered) })
  expect(response.status).toBe(200)
  expect(answerMap()).toEqual({ "A_ans_item-1": "sun", "B_ans_item-1": "moon" })
  const db = storage()
  try {
    expect(db.getLatestNodeData("web-rendering", "pg001")).toEqual(raw)
    expect(db.getLatestNodeData("text-catalog-translation", "fr")).toEqual(corrections)
    expect(buildImageInventory(db).map(({ id, sectionIds }) => ({ id, sectionIds }))).toEqual([{ id: "image-A", sectionIds: ["A"] }, { id: "image-B", sectionIds: ["B"] }])
    expect(buildEasyReadSourceBlocks(db, db.getPages()).map((block) => [block.sectionId, block.entries[0].sourceId])).toEqual([["A", "text-A"], ["B", "text-B"]])
    expect(resolveReadingOrder(db).items.map((item) => item.id)).toEqual(["A", "B"])
    await packageAdtWeb(db, { bookDir: db.bookDir!, label, language: "en", outputLanguages: ["en", "fr"], title: "Owners", webAssetsDir: path.resolve("assets/adt"), config: loadBookConfig(label, root), promptsDir: path.resolve("prompts"), configDir: path.resolve("config") })
    expect(fs.readFileSync(path.join(db.bookDir!, "adt/A.html"), "utf8")).toContain('"item-1":"sun"')
    expect(fs.readFileSync(path.join(db.bookDir!, "adt/B.html"), "utf8")).toContain('"item-1":"moon"')
    db.putNodeData("page-sectioning", "pg001", { ...reordered, sections: reordered.sections.map((section) => ({ ...section, isPruned: section.sectionId === "A" })) })
    expect(resolveReadingOrder(db).items.map((item) => item.id)).toEqual(["B"])
    expect(buildImageInventory(db).map((item) => item.id)).toEqual(["image-B"])
    expect(buildEasyReadSourceBlocks(db, db.getPages()).map((block) => block.sectionId)).toEqual(["B"])
    expect(buildTextCatalogSnapshot(db, db.getPages()).entries.filter((entry) => entry.id.includes("_ans_")).map((entry) => entry.id)).toEqual(["B_ans_item-1"])
    db.setCurrentNodeVersion("page-sectioning", "pg001", 1)
    expect(resolveReadingOrder(db).items.map((item) => item.id)).toEqual(["A", "B"])
    expect(db.getLatestNodeData("text-catalog-translation", "fr")).toEqual(corrections)
  } finally { db.close() }
  expect(provider).not.toHaveBeenCalled()
})

it.each(["removed", "identityless", "conflicting", "nested"] as const)("AC-4/12 retains and discloses %s owners without assigning another section's answers", async (scenario) => {
  const db = storage()
  const next = structuredClone(rendering)
  if (scenario === "identityless") next.sections[0].html = next.sections[0].html.replace(' data-section-id="A"', "")
  if (scenario === "conflicting") next.sections[0].sectionId = "B"
  if (scenario === "nested") next.sections[0].html += '<section data-section-id="B"></section>'
  db.putNodeData("web-rendering", "pg001", next)
  // Stable leaves can move while an old rendering remains: they do not prove ownership.
  db.putNodeData("page-sectioning", "pg001", { ...sections, sections: [{ ...sections.sections[1], nodes: sections.sections[0].nodes }] })
  const raw = db.getAllNodeVersions("web-rendering", "pg001")
  const corrections = db.getLatestNodeData("text-catalog-translation", "fr")
  expect(buildTextCatalogSnapshot(db, db.getPages()).entries.find((entry) => entry.id === "B_ans_item-1")?.text).toBe("moon")
  expect(resolveReadingOrder(db).items.map((item) => item.id)).toEqual(["B"])
  expect(renderingOwnershipWarnings(db)).toEqual([{ kind: "orphaned-rendering", pageId: "pg001", sectionIndex: 0 }])
  db.close()
  const app = createOutputRoutes(root, path.resolve("prompts"))
  for (const suffix of ["", "/disclosure"]) {
    const response = await app.request(`/books/${label}/outputs${suffix}`)
    expect(response.status).toBe(200)
    expect((await response.json()).ownershipWarnings).toHaveLength(1)
  }
  const reopened = storage()
  expect(reopened.getAllNodeVersions("web-rendering", "pg001")).toEqual(raw)
  expect(reopened.getLatestNodeData("text-catalog-translation", "fr")).toEqual(corrections)
  reopened.close()
})


it("keeps develop-shaped fixed-layout content available without regenerating or rewriting it", async () => {
  const db = storage()
  const id = "pg001_sec001"
  db.putNodeData("fixed-layout-sectioning", "pg001", { ...sections, sections: [{ ...sections.sections[0], sectionId: id, sectionType: "fixed-layout-page" }] })
  db.putNodeData("web-rendering", "pg001", { sections: [{ sectionIndex: 0, sectionType: "fixed-layout-page", reasoning: "develop", html: '<div id="content" style="position:relative;width:100px;height:100px"><p data-id="pg001_tx001">Retained manual page</p></div>' }] })
  const history = db.getAllNodeVersions("web-rendering", "pg001")
  expect(resolveReadingOrder(db).items.map((item) => item.id)).toEqual([id])
  expect(buildEasyReadSourceBlocks(db, db.getPages())[0].entries[0].originalText).toBe("Retained manual page")
  expect(buildTextCatalogSnapshot(db, db.getPages()).entries[0].locations?.[0].sectionId).toBe(id)
  expect(renderingOwnershipWarnings(db)).toEqual([])
  await packageAdtWeb(db, { bookDir: db.bookDir!, label, language: "en", outputLanguages: ["en"], title: "Fixed", webAssetsDir: path.resolve("assets/adt"), config: loadBookConfig(label, root), promptsDir: path.resolve("prompts"), configDir: path.resolve("config") })
  const exported = fs.readFileSync(path.join(db.bookDir!, `adt/${id}.html`), "utf8")
  expect(exported).toContain("Retained manual page")
  expect(exported).toContain(`data-section-id="${id}"`)
  expect(db.getAllNodeVersions("web-rendering", "pg001")).toEqual(history)
  db.close()
  const preview = createAdtPreviewRoutes(root, path.resolve("assets/adt"))
  const response = await preview.request(`/books/${label}/adt-preview/${id}.html`)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain("Retained manual page")
})

it("Preview uses the rendering's owner after sectioning restore rather than its old index", async () => {
  const db = storage()
  db.putNodeData("page-sectioning", "pg001", { ...sections, sections: [{ ...sections.sections[1], sectionId: "pg001_sec002" }] })
  db.putNodeData("web-rendering", "pg001", { sections: rendering.sections.map((entry, i) => ({ ...entry, sectionId: `pg001_sec00${i + 1}`, html: `<section data-section-id="pg001_sec00${i + 1}"><p>Question ${i === 0 ? "A" : "B"}</p></section>` })) })
  db.close()
  const response = await createAdtPreviewRoutes(root, path.resolve("assets/adt")).request(`/books/${label}/adt-preview/pg001_sec002.html`)
  expect(response.status).toBe(200)
  const html = await response.text()
  expect(html).toContain("Question B")
  expect(html).not.toContain("Question A")
  expect(html).toContain('"item-1":"moon"')
})

it("new assistant custom activities and their updates have stable owners in Preview and export", async () => {
  const db = storage()
  const { tools } = createBookTools({ storage: db, bookLabel: label, booksDir: root, promptsDir: path.resolve("prompts"), credentials: {}, activityMode: "custom" })
  const created = await tools.createCustomSection!.execute!({ pageId: "pg001", sectionType: "activity_custom_test", reasoning: "test", html: '<section data-id="activity-root"><p data-id="custom-question">Custom question</p><script>window.adtRegisterCustomActivity(document.currentScript.closest("section"),{validate:()=>true});</script></section>', activityAnswers: { answer: "Custom answer" } }, {} as never) as { sectionId: string; sectionIndex: number }
  expect(created).toMatchObject({ ok: true })
  expect(resolveReadingOrder(db).items.map((item) => item.id)).toContain(created.sectionId)
  await tools.updateSection!.execute!({ pageId: "pg001", sectionIndex: created.sectionIndex, reasoning: "edited", html: '<section><p data-id="custom-question">Edited custom question</p></section>', activityAnswers: { answer: "Edited answer" } }, {} as never)
  expect(buildTextCatalogSnapshot(db, db.getPages()).entries.find((entry) => entry.id === `${created.sectionId}_ans_answer`)?.text).toBe("Edited answer")
  await packageAdtWeb(db, { bookDir: db.bookDir!, label, language: "en", outputLanguages: ["en"], title: "Custom", webAssetsDir: path.resolve("assets/adt"), config: loadBookConfig(label, root), promptsDir: path.resolve("prompts"), configDir: path.resolve("config") })
  expect(fs.readFileSync(path.join(db.bookDir!, `adt/${created.sectionId}.html`), "utf8")).toContain("Edited custom question")
  db.close()
  const response = await createAdtPreviewRoutes(root, path.resolve("assets/adt")).request(`/books/${label}/adt-preview/${created.sectionId}.html`)
  expect(response.status).toBe(200)
  expect(await response.text()).toContain("Edited custom question")
})


it("retains retired Easy Read history without exposing it in Preview or export", async () => {
  const db = storage()
  fs.appendFileSync(path.join(db.bookDir!, "config.yaml"), "easy_read:\n  enabled: true\n")
  const source = { ...sections.sections[0], sectionId: "pg001_sec001", sectionType: "text", nodes: [] }
  db.putNodeData("page-sectioning", "pg001", { reasoning: "", sections: [source] })
  const rendered = { sectionId: source.sectionId, sectionIndex: 0, sectionType: "text", reasoning: "", html: '<section data-section-id="pg001_sec001"><p data-id="retired">Retired phrase</p></section>' }
  db.putNodeData("web-rendering", "pg001", { sections: [rendered] })
  const blocks = buildEasyReadSourceBlocks(db, db.getPages())
  blocks[0].entries[0].text = "Retained manual Easy Read"
  blocks[0].entries[0].source = "manual"
  db.putNodeData("easy-read", "book", { blocks, generatedAt: "before" })
  const retained = db.getAllNodeVersions("easy-read", "book")
  db.putNodeData("web-rendering", "pg001", { sections: [{ ...rendered, html: '<section data-section-id="pg001_sec001"><h1 data-id="current">Current heading</h1></section>' }] })
  expect(buildEasyReadSourceBlocks(db, db.getPages()).flatMap((block) => block.entries)).toEqual([])
  await packageAdtWeb(db, { bookDir: db.bookDir!, label, language: "en", outputLanguages: ["en"], title: "Retired", webAssetsDir: path.resolve("assets/adt"), config: loadBookConfig(label, root), promptsDir: path.resolve("prompts"), configDir: path.resolve("config") })
  const config = JSON.parse(fs.readFileSync(path.join(db.bookDir!, "adt/assets/config.json"), "utf8"))
  const texts = JSON.parse(fs.readFileSync(path.join(db.bookDir!, "adt/content/i18n/en/texts.json"), "utf8"))
  expect(config.features.easyRead).toBe(false)
  expect(texts).not.toHaveProperty("retired_easy_read")
  expect(db.getAllNodeVersions("easy-read", "book")).toEqual(retained)
  db.close()
  const preview = createAdtPreviewRoutes(root, path.resolve("assets/adt"))
  const previewConfig = await (await preview.request(`/books/${label}/adt-preview/assets/config.json`)).json()
  const previewTexts = await (await preview.request(`/books/${label}/adt-preview/content/i18n/en/texts.json`)).json()
  expect(previewConfig.features.easyRead).toBe(false)
  expect(previewTexts).not.toHaveProperty("retired_easy_read")
})
