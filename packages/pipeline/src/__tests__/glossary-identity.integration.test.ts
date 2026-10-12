import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, expect, it } from "vitest"
import { createBookStorage } from "@adt/storage"
import type { LLMModel } from "@adt/llm"
import { regenerateGlossaryPreservingEdits, getGlossaryItemTextId } from "../glossary.js"
import { buildTextCatalogSnapshot } from "../text-catalog.js"

let root: string
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), "glossary-identity-")) })
afterEach(() => fs.rmSync(root, { recursive: true, force: true }))
const term = (word: string) => ({ word, definition: `Definition of ${word}`, variations: [], emojis: [], source: "ai" as const })

it("inserting an earlier term retains legacy/manual identities and downstream corrections; rollback cannot recycle a spent ID", async () => {
  const storage = createBookStorage("book", root)
  try {
    storage.putNodeData("web-rendering", "pg001", { sections: [{ sectionIndex: 0, sectionType: "content", reasoning: "", html: "<p>Glossary source.</p>" }] })
    const original = storage.putNodeData("glossary", "book", { items: [term("Forest"), { ...term("River"), id: "gl_manual_river", source: "manual" }], pageCount: 1, generatedAt: "old" })
    storage.putNodeData("text-catalog-translation", "fr", { entries: [{ id: "gl001_def", text: "Correction forêt", source: "manual" }], generatedAt: "old" })
    const translateBefore = storage.getLatestNodeData("text-catalog-translation", "fr")
    const run = async (words: string[]) => regenerateGlossaryPreservingEdits({ storage, pages: [{ pageId: "pg001", pageNumber: 1, text: "" }], config: { promptName: "glossary", modelId: "test", maxRetries: 0, language: "en", batchSize: 10 },
      llmModel: { generateObject: async () => ({ object: { items: words.map(term) } }) } as unknown as LLMModel })
    const first = await run(["Ash", "Forest", "River"])
    const id = (word: string) => { const index = first.items.findIndex((item) => item.word === word); return getGlossaryItemTextId(first.items[index], index) }
    expect(id("Forest")).toBe("gl001")
    expect(id("River")).toBe("gl_manual_river")
    expect(id("Ash")).not.toBe("gl001")
    storage.putNodeData("glossary", "book", first)
    expect(buildTextCatalogSnapshot(storage, []).entries.find((entry) => entry.id === "gl001_def")?.text).toBe("Definition of Forest")
    expect(storage.getLatestNodeData("text-catalog-translation", "fr")).toEqual(translateBefore)
    storage.setCurrentNodeVersion("glossary", "book", original)
    const afterRollback = await run(["Beech", "Forest"])
    const beech = afterRollback.items.findIndex((item) => item.word === "Beech")
    expect(getGlossaryItemTextId(afterRollback.items[beech], beech)).not.toBe(id("Ash"))
    expect(afterRollback.items.find((item) => item.word === "Forest")?.id).toBe("gl001")
  } finally { storage.close() }
})
