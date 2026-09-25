// PR #712's wire-count regression adapted to current ports and a stub fetch boundary.
// The real provider adapter and AI SDK run; no client/helper mock hides SDK retries.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { createRateLimiter } from "../rate-limiter.js"
import { createLLMModel } from "../client.js"
import type { LlmLogEntry } from "../log.js"

const fetchMock = vi.fn<typeof fetch>()
const dirs: string[] = []
const request = {
  schema: z.object({ ok: z.boolean() }),
  messages: [{ role: "user" as const, content: "Return JSON" }],
  maxRetries: 2,
  log: { taskType: "test", promptName: "test" },
}
function model(options: Partial<Parameters<typeof createLLMModel>[0]> = {}) {
  return createLLMModel({
    modelId: "custom:gpt-4.1",
    credentials: { customBaseUrl: "http://provider.test/v1", customApiKey: "secret-test-key" },
    logLevel: "silent",
    ...options,
  })
}
function response(content: string, tool = false) {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      created: 0,
      model: "gpt-4.1",
      choices: [
        {
          index: 0,
          message: tool
            ? {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call-1",
                    type: "function",
                    function: { name: "json", arguments: content },
                  },
                ],
              }
            : { role: "assistant", content },
          finish_reason: tool ? "tool_calls" : "stop",
        },
      ],
      usage: { prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 },
    }),
    { headers: { "content-type": "application/json" } },
  )
}
beforeEach(() => {
  vi.useFakeTimers()
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})
async function exhaust(promise: Promise<unknown>) {
  const caught = promise.catch((err: unknown) => err)
  await vi.advanceTimersByTimeAsync(10000)
  return caught
}

describe("single provider request budget", () => {
  it.each([408, 429, 500, 503])("sends exactly three requests on HTTP %s", async (status) => {
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ error: { message: "temporary", type: "rate_limit_error" } }),
          { status, headers: { "content-type": "application/json" } },
        ),
    )
    const error = await exhaust(model().generateObject(request))
    expect(error).toMatchObject({
      attempts: 3,
      providerCalls: 3,
      classification: { retryable: true },
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
  it.each(["EAI_AGAIN", "UND_ERR_SOCKET", "ECONNRESET", "ETIMEDOUT"])(
    "sends exactly three requests for nested %s",
    async (code) => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed", { cause: { code } }))
      expect(await exhaust(model().generateObject(request))).toMatchObject({ providerCalls: 3 })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    },
  )
  it.each([
    [401, "invalid_api_key"],
    [403, "permission_denied"],
    [404, "model_not_found"],
    [429, "insufficient_quota"],
  ])("sends one request for permanent %s/%s", async (status, code) => {
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            error: { message: "secret-test-key Authorization: Bearer secret", code },
          }),
          { status: Number(status), headers: { "content-type": "application/json" } },
        ),
    )
    const logs: LlmLogEntry[] = []
    const error = await exhaust(
      model({ onLog: (entry) => logs.push(entry) }).generateObject(request),
    )
    expect(error).toMatchObject({
      attempts: 1,
      providerCalls: 1,
      classification: { retryable: false },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.stringify({ error, logs })).not.toContain("secret-test-key")
    expect(JSON.stringify(logs)).not.toContain("Authorization")
    expect(logs[0].usage).toBeUndefined()
  })
  it.each(["json", "tool", "parse"])(
    "uses the same budget for malformed %s output",
    async (mode) => {
      fetchMock.mockImplementation(async () => response("{malformed", mode === "tool"))
      const llm =
        mode === "parse"
          ? model({
              modelId: "ollama:tinyllama",
              providerCredentials: { ollama: { baseUrl: "http://provider.test/v1" } },
            })
          : model()
      const error = await exhaust(
        llm.generateObject({
          ...request,
          ...(mode !== "parse" ? { mode: mode as "json" | "tool" } : {}),
        }),
      )
      expect(error).toMatchObject({
        attempts: 3,
        providerCalls: 3,
        classification: { errorClass: "model-output" },
      })
      expect(fetchMock).toHaveBeenCalledTimes(3)
    },
  )
  it("uses the same budget for native-schema output", async () => {
    fetchMock.mockImplementation(async () => response("{malformed"))
    await exhaust(
      model({
        modelId: "openai:gpt-4.1",
        providerCredentials: { openai: { apiKey: "test" } },
      }).generateObject(request),
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
  it("cancels during backoff without sending another request", async () => {
    const controller = new AbortController()
    const logs: LlmLogEntry[] = []
    fetchMock.mockRejectedValue(new Error("unknown"))
    const pending = model({ signal: controller.signal, onLog: (entry) => logs.push(entry) })
      .generateObject(request)
      .catch((err) => err)
    await vi.advanceTimersByTimeAsync(1)
    controller.abort()
    expect(await pending).toMatchObject({ classification: { errorClass: "cancelled" } })
    await vi.advanceTimersByTimeAsync(10000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(logs.at(-1)).toMatchObject({ outcome: "cancelled", providerCall: false })
    expect(logs.at(-1)?.usage).toBeUndefined()
  })
  it("honors both model and per-call signals before cache or transport admission", async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      model({ signal: controller.signal }).generateObject({
        ...request,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it("cancels during an actual pending transport", async () => {
    const controller = new AbortController()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true,
          }),
        ),
    )
    const pending = model({ signal: controller.signal })
      .generateObject(request)
      .catch((err) => err)
    await vi.advanceTimersByTimeAsync(1)
    controller.abort()
    expect(await pending).toMatchObject({ classification: { errorClass: "cancelled" } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it("validates real disk cache hits and preserves unrelated entries", async () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec0013-cache-"))
    dirs.push(cacheDir)
    const logs: LlmLogEntry[] = []
    fetchMock.mockImplementation(async () => response('{"ok":true}'))
    const llm = model({ cacheDir, onLog: (entry) => logs.push(entry) })
    await llm.generateObject(request)
    const firstFiles = fs.readdirSync(cacheDir)
    const second = await llm.generateObject(request)
    expect(second.cached).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(logs.at(-1)).toMatchObject({ cacheHit: true, providerCall: false })
    expect(logs.at(-1)?.usage).toBeUndefined()
    const unrelated = path.join(cacheDir, "unrelated.json")
    fs.writeFileSync(unrelated, "keep")
    for (const file of firstFiles)
      fs.writeFileSync(path.join(cacheDir, file), JSON.stringify({ ok: "bad" }))
    const repaired = await llm.generateObject(request)
    expect(repaired.object).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fs.readFileSync(unrelated, "utf8")).toBe("keep")
    expect(logs.at(-2)).toMatchObject({
      cacheHit: true,
      providerCall: false,
      errorClass: "model-output",
    })
  })
  it("never caches rejected semantic output and reports final exhaustion", async () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "spec0013-invalid-"))
    dirs.push(cacheDir)
    const logs: LlmLogEntry[] = []
    fetchMock.mockImplementation(async () => response('{"ok":true}'))
    await exhaust(
      model({ cacheDir, onLog: (entry) => logs.push(entry) }).generateObject({
        ...request,
        validate: () => ({ valid: false, errors: ["Try a different answer"] }),
      }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fs.readdirSync(cacheDir)).toEqual([])
    expect(logs.at(-1)).toMatchObject({
      outcome: "failed",
      errorClass: "model-output",
      finalError: true,
      usage: { inputTokens: 2, outputTokens: 3 },
    })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).messages.at(-1).content).toContain(
      "Try a different answer",
    )
  })
  it("cancels while waiting for admission without contacting the provider", async () => {
    const limiter = createRateLimiter(1)
    await limiter.acquire()
    const controller = new AbortController()
    const pending = model({ signal: controller.signal, rateLimiter: limiter })
      .generateObject(request)
      .catch((error) => error)
    await vi.advanceTimersByTimeAsync(1)
    controller.abort()
    expect(await pending).toMatchObject({
      providerCalls: 0,
      classification: { errorClass: "cancelled" },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it("does not re-bill a valid response when local cache publication fails", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spec0013-cache-failure-"))
    dirs.push(dir)
    const cacheDir = path.join(dir, "occupied")
    fs.writeFileSync(cacheDir, "keep")
    fetchMock.mockImplementation(async () => response('{"ok":true}'))
    const error = await exhaust(model({ cacheDir }).generateObject(request))
    expect(error).toMatchObject({ providerCalls: 1, classification: { retryable: false } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fs.readFileSync(cacheDir, "utf8")).toBe("keep")
  })
})
