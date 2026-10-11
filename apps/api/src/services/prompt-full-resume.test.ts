import fs from "node:fs"
import path from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { createPromptRoutes } from "../routes/prompts.js"
import { createOutputRoutes } from "../routes/outputs.js"
import { runFullPipeline } from "@adt/pipeline"
import { setupFullResumeFixture } from "../../../../packages/pipeline/src/__tests__/fixtures/full-resume.js"
import { openBookDb } from "@adt/storage"
import { exportProject } from "./export-service.js"
import { importProject } from "./import-service.js"

let fixture: ReturnType<typeof setupFullResumeFixture>
let overrides: string
beforeEach(() => {
  fixture = setupFullResumeFixture()
  fs.cpSync(fixture.options().templatesDir, path.join(fixture.root, "templates"), { recursive: true })
  overrides = path.join(fixture.root, "global")
  vi.stubEnv("PROMPT_OVERRIDES_DIR", overrides)
  fs.writeFileSync(path.join(fixture.options().promptsDir, "_shared.liquid"), "original")
  fs.writeFileSync(path.join(fixture.options().promptsDir, "unused.liquid"), "unused")
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); fs.rmSync(fixture.root, { recursive: true, force: true }) })
const run = () => runFullPipeline({ ...fixture.options(), promptOverridesDir: overrides })
function api(books = fixture.options().booksRoot, global = overrides) { return createPromptRoutes(fixture.options().promptsDir, books, fixture.options().configPath, global) }
async function save(name: string, content: string, url = `/prompts/${name}?model=ollama:tinyllama`) {
  const routes = api(), loaded = await (await routes.request(url)).json()
  const response = await routes.request(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ revision: loaded.revision, content }) })
  expect(response.status).toBe(200)
  return response.json()
}
async function outputs(books = fixture.options().booksRoot) {
  const response = await createOutputRoutes(books, fixture.options().promptsDir, fixture.options().configPath).request("/books/book/outputs")
  expect(response.status).toBe(200)
  return (await response.json()).outputs as Array<{ identity: {kind: string}; current: boolean; signature: string; excluded: boolean }>
}
it("full resume compares actual selected model/includes, leaves unrelated scopes current, and reuses restored provider inputs", { timeout: 120000 }, async () => {
  const template = '{% chat role: "user" %}book_summary {% include "_shared" %}{% endchat %}'
  await save("book_summary", template)
  expect(fixture.transport).not.toHaveBeenCalled()
  expect(fixture.errors(await run())).toEqual([])
  const before = fixture.histories(), calls = fixture.transport.mock.calls.length
  await save("book_summary", "ignored generic", "/books/book/prompts/book_summary")
  await save("unused", "unrelated")
  expect(fixture.transport).toHaveBeenCalledTimes(calls)
  expect((await outputs()).find((o) => o.identity.kind === "extract-generation")?.current).toBe(true)
  expect(fixture.errors(await run())).toEqual([])
  expect(fixture.histories()).toEqual(before)
  expect(fixture.transport).toHaveBeenCalledTimes(calls)
  await save("_shared", "changed")
  const changed = await outputs()
  expect(changed.find((o) => o.identity.kind === "extract-generation")?.current).toBe(false)
  expect(changed.find((o) => o.identity.kind === "sectioning")?.current).toBe(true)
  expect(changed.find((o) => o.identity.kind === "storyboard")?.current).toBe(true)
  expect(fixture.errors(await run())).toEqual([])
  expect(fixture.transport).toHaveBeenCalledTimes(calls + 1)
  expect(JSON.stringify(fixture.transport.mock.calls.at(-1))).toContain("book_summary changed")
  expect(fixture.histories().filter((row) => ["page-sectioning", "web-rendering"].includes(row.node)))
    .toEqual(before.filter((row) => ["page-sectioning", "web-rendering"].includes(row.node)))
  await save("_shared", "original")
  expect(fixture.errors(await run())).toEqual([])
  expect(fixture.transport).toHaveBeenCalledTimes(calls + 1)
})
it("rejects changed in-flight prompt publication and retains historical output and actual call bytes", { timeout: 120000 }, async () => {
  await save("book_summary", '{% chat role: "user" %}book_summary A{% endchat %}')
  expect(fixture.errors(await run())).toEqual([])
  const before = fixture.histories()
  await save("book_summary", '{% chat role: "user" %}book_summary B{% endchat %}')
  const respond = fixture.transport.getMockImplementation()!
  fixture.transport.mockImplementation(async (...args) => {
    const result = await respond(...args)
    await save("book_summary", '{% chat role: "user" %}book_summary C{% endchat %}')
    return result
  })
  const result = await run()
  expect(result.resume?.status).toBe("failed")
  expect(fixture.histories()).toEqual(before)
  const db = openBookDb(path.join(fixture.options().booksRoot, "book/book.db"))
  try { expect(JSON.stringify(db.all("SELECT data FROM llm_log"))).toContain("book_summary B") } finally { db.close() }
  fixture.transport.mockImplementation(respond)
  expect(fixture.errors(await run())).toEqual([])
})
it("import compares the new host's effective globals while preserving book overrides and historical evidence", { timeout: 120000 }, async () => {
  await save("book_summary", '{% chat role: "user" %}book_summary source host{% endchat %}')
  expect(fixture.errors(await run())).toEqual([])
  const original = await outputs(), archive = await exportProject("book", fixture.options().booksRoot)
  const bytes = Buffer.from(await new Response(archive.stream).arrayBuffer())
  const destination = path.join(fixture.root, "imported")
  fs.mkdirSync(destination)
  await importProject(bytes, destination)
  const sourceCalls = fixture.transport.mock.calls.length
  vi.stubEnv("PROMPT_OVERRIDES_DIR", path.join(fixture.root, "other-host"))
  const imported = await outputs(destination)
  expect(imported.find((o) => o.identity.kind === "extract-generation")?.current).toBe(false)
  expect(imported.find((o) => o.identity.kind === "extract-generation")?.signature).not.toBe(original.find((o) => o.identity.kind === "extract-generation")?.signature)
  expect(imported.find((o) => o.identity.kind === "sectioning")?.current).toBe(true)
  expect(fixture.transport).toHaveBeenCalledTimes(sourceCalls)
  const db = openBookDb(path.join(destination, "book/book.db"))
  try { expect(JSON.stringify(db.all("SELECT data FROM llm_log"))).toContain("book_summary source host") } finally { db.close() }
})

it("direct Easy Read pins both blocks and their evidence through an in-flight A-B-A edit", { timeout: 120000 }, async () => {
  const { createEasyReadRoutes } = await import("../routes/easy-read.js")
  const { PageSectioningOutput, WebRenderingOutput } = await import("@adt/types")
  expect(fixture.errors(await run())).toEqual([])
  const storage = fixture.storage()
  try {
    const page = storage.getPages()[0].pageId
    const sections = PageSectioningOutput.parse(storage.getLatestNodeData("page-sectioning", page)!.data)
    sections.sections.push({ ...sections.sections[0], sectionId: "second" })
    storage.putNodeData("page-sectioning", page, sections)
    const rendering = WebRenderingOutput.parse(storage.getLatestNodeData("web-rendering", page)!.data)
    rendering.sections = [0, 1].map((index) => ({ ...rendering.sections[0], sectionIndex: index, html: `<section><p data-id="text${index}">Text ${index}</p></section>` }))
    storage.putNodeData("web-rendering", page, rendering)
  } finally { storage.close() }
  fs.writeFileSync(path.join(fixture.options().promptsDir, "easy_read.liquid"), '{% chat role: "user" %}A {{ section_text }}{% endchat %}')
  const content = '{% chat role: "user" %}A {{ section_text }}{% endchat %}'
  await save("easy_read", content)
  const requests: string[] = []
  fixture.transport.mockImplementation(async (_url, init) => {
    requests.push(String(init?.body))
    await save("easy_read", requests.length === 1 ? content.replace("A ", "B ") : content)
    return Response.json({ id: "fixture", object: "chat.completion", created: 0, model: "fixture", choices: [{ index: 0, message: { role: "assistant", content: '{"texts":["Simplified"]}' }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })
  })
  const response = await createEasyReadRoutes(fixture.options().booksRoot, fixture.options().promptsDir, fixture.options().configPath).request("/books/book/easy-read/regenerate", { method: "POST" })
  expect(response.status).toBe(200)
  expect(requests).toHaveLength(2)
  expect(requests[0]).toContain("A Text 0")
  expect(requests[1]).toContain("A Text 1")
  expect(requests.join("")).not.toContain("B Text")
  const result = await response.json()
  expect(result.blocks).toHaveLength(2)
  expect(result.blocks.every((block: { entries: Array<{ input?: { signature: string } }> }) => block.entries.every((entry) => !!entry.input?.signature))).toBe(true)
})

it("unresolved dynamic includes block only their consumers and never publish a freshness proof", { timeout: 120000 }, async () => {
  const { readOutputCatalog, loadBookConfig } = await import("@adt/pipeline")
  expect(fixture.errors(await run())).toEqual([])
  const calls = fixture.transport.mock.calls.length, history = fixture.histories()
  fs.writeFileSync(path.join(fixture.options().promptsDir, "easy_read.liquid"), '{% assign part = "_shared" %}{% include part %}')
  // This prompt is not consumed while Easy Read is disabled.
  expect((await outputs()).find((o) => o.identity.kind === "storyboard")?.current).toBe(true)
  expect(fixture.errors(await run())).toEqual([])
  const result = await runFullPipeline({ ...fixture.options(), promptOverridesDir: overrides, fromStage: "easy-read", toStage: "easy-read" })
  expect(result.resume?.status).toBe("incomplete")
  expect(result.resume?.outputs.filter((o) => o.identity.kind === "easy-read").every((o) => o.state === "blocked")).toBe(true)
  expect(fixture.transport).toHaveBeenCalledTimes(calls)
  expect(fixture.histories()).toEqual(history)
  const storage = fixture.storage()
  try {
    const config = loadBookConfig("book", fixture.options().booksRoot, fixture.options().configPath)
    config.easy_read = { ...config.easy_read, enabled: true }
    const statuses = readOutputCatalog({ storage, config, bookDir: path.join(fixture.options().booksRoot, "book"), promptsDir: fixture.options().promptsDir, promptOverridesDir: overrides, configDir: fixture.options().configDir })
    expect(statuses.filter((o) => o.identity.kind === "easy-read").length).toBeGreaterThan(0)
    expect(statuses.filter((o) => o.identity.kind === "easy-read").every((o) => o.blocked && !o.current)).toBe(true)
  } finally { storage.close() }
})
