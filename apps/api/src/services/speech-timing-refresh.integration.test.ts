import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { createBookStorage } from "@adt/storage"
import type { TTSOutput, WordTimestampOutput } from "@adt/types"
import { createStageRunner } from "./stage-runner.js"

let root: string
const label = "timing-refresh"
const transport = vi.fn<typeof fetch>()
const storage = () => createBookStorage(label, root)
const configure = (model = "gpt-4o-mini-tts", voice = "alloy") => fs.writeFileSync(path.join(root, label, "config.yaml"), `editing_language: en\noutput_languages: [en]\ncore_tts:\n  language_normalization: false\n  latex_to_speech: false\nspeech:\n  default_provider: openai\n  model: ${model}\n  word_highlighting: true\n  primary_voices:\n    openai:\n      en:\n        voice: ${voice}\n`)
const run = () => createStageRunner().run(label, { booksDir: root, promptsDir: path.resolve("prompts"), fromStage: "speech", toStage: "speech", credentials: { openai: { apiKey: "stub-transport" } } }, { emit: () => undefined })
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "timing-refresh-"))
  const db = storage()
  db.putNodeData("metadata", "book", { language_code: "en" })
  db.putNodeData("text-catalog", "book", { entries: [{ id: "stable", text: "Hello" }], generatedAt: "before" })
  db.close()
  configure()
  let synthesis = 0
  transport.mockReset().mockImplementation(async (url) => {
    if (String(url).includes("/audio/speech")) return new Response(Buffer.from(`audio bytes ${++synthesis}`))
    if (String(url).includes("/audio/transcriptions")) return Response.json({ text: "Hello", duration: 1, words: [{ word: "Hello", start: 0, end: 0.8 }] })
    throw new Error(`Unexpected provider URL: ${url}`)
  })
  vi.stubGlobal("fetch", transport)
})
afterEach(() => { vi.unstubAllGlobals(); fs.rmSync(root, { recursive: true, force: true }) })

it.each(["model", "voice"])("refreshes timings for new audio after only the %s changes, and reuses both on a no-op", async (change) => {
  await run()
  configure(change === "model" ? "tts-1" : "gpt-4o-mini-tts", change === "voice" ? "onyx" : "alloy")
  await run()
  expect(transport.mock.calls.filter(([url]) => String(url).includes("/audio/speech"))).toHaveLength(2)
  expect(transport.mock.calls.filter(([url]) => String(url).includes("/audio/transcriptions"))).toHaveLength(2)
  const db = storage()
  const audio = db.getLatestNodeData("tts", "en")!.data as TTSOutput
  const timing = db.getLatestNodeData("tts-timestamps", "en")!.data as WordTimestampOutput
  expect(Object.values(timing.entries)).toHaveLength(1)
  expect(Object.values(timing.entries)[0].audioHash).toBe(audio.entries[0].audioHash)
  db.close()
  await run()
  expect(transport).toHaveBeenCalledTimes(4)
})
