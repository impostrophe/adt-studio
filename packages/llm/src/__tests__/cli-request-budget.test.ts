import http from "node:http"
import net from "node:net"
import { afterEach, expect, it, vi } from "vitest"
import { createCliRequestBudget } from "../providers/shared/cli-request-budget.js"

const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanup.reverse()) await close()
  cleanup.length = 0
})
async function listen(server: http.Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  cleanup.push(async () => {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
  return `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`
}
async function budget(
  upstream: string,
  env: NodeJS.ProcessEnv = {},
  signal = new AbortController().signal,
) {
  const gate = await createCliRequestBudget({ upstream: () => upstream, env, signal })
  cleanup.push(() => gate.close())
  return gate
}
it("reserves the single upstream slot before concurrent requests can reach transport", async () => {
  let calls = 0
  const origin = await listen(
    http.createServer((_req, res) => {
      calls++
      res.end("fixture")
    }),
  )
  const gate = await budget(origin)
  await fetch(`${gate.url}/responses`, { method: "POST", body: "first" })
  await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      fetch(`${gate.url}/responses`, { method: "POST", body: "continuation" }),
    ),
  )
  expect(calls).toBe(1)
  expect(() => gate.check()).toThrow("Model output")
})
it("keeps CLI-selected credentials, organization, project and body bytes unchanged", async () => {
  let received: unknown
  const body = Buffer.from([0, 1, 2, 255])
  const origin = await listen(
    http.createServer(async (req, res) => {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk)
      received = {
        body: Buffer.concat(chunks),
        auth: req.headers.authorization,
        org: req.headers["openai-organization"],
        project: req.headers["openai-project"],
        account: req.headers["chatgpt-account-id"],
        url: req.url,
      }
      res.writeHead(200, { "content-type": "text/event-stream" })
      res.end("data: fixture\n\n")
    }),
  )
  const gate = await budget(origin + "/api")
  const response = await fetch(`${gate.url}/responses?beta=true`, {
    method: "POST",
    body,
    headers: {
      authorization: "Bearer fixture-login",
      "chatgpt-account-id": "fixture-account",
      "openai-organization": "fixture-org",
      "openai-project": "fixture-project",
    },
  })
  expect(await response.text()).toBe("data: fixture\n\n")
  expect(received).toEqual({
    body,
    auth: "Bearer fixture-login",
    org: "fixture-org",
    project: "fixture-project",
    account: "fixture-account",
    url: "/api/responses?beta=true",
  })
  gate.check()
})
it("honors the original proxy configuration while the CLI bypasses it for loopback", async () => {
  let calls = 0,
    connections = 0
  const origin = await listen(
    http.createServer((_req, res) => {
      calls++
      res.end("proxied")
    }),
  )
  const proxy = http.createServer()
  proxy.on("connect", (req, downstream, head) => {
    connections++
    expect(req.headers["proxy-authorization"]).toBe("Basic Zml4dHVyZTprZXk=")
    // Deliberately unresolvable target proves the upstream cannot bypass proxy.
    expect(req.url).toBe("provider.invalid:80")
    const target = new URL(origin)
    const upstream = net.connect(Number(target.port), target.hostname, () => {
      downstream.write("HTTP/1.1 200 Connection Established\r\n\r\n")
      if (head.length) upstream.write(head)
      downstream.pipe(upstream)
      upstream.pipe(downstream)
    })
    upstream.on("error", () => downstream.destroy())
    downstream.on("close", () => upstream.destroy())
  })
  const proxyOrigin = await listen(proxy)
  const gate = await budget("http://provider.invalid", {
    HTTP_PROXY: proxyOrigin.replace("://", "://fixture:key@"),
  })
  const response = await fetch(`${gate.url}/responses`, { method: "POST", body: "fixture" })
  expect(await response.text()).toBe("proxied")
  expect(connections).toBe(1)
  expect(calls).toBe(1)
  expect(gate.env.NO_PROXY).toContain("127.0.0.1")
})
it("cancellation before forwarding makes no provider request", async () => {
  let calls = 0
  const origin = await listen(
    http.createServer((_req, res) => {
      calls++
      res.end()
    }),
  )
  const controller = new AbortController()
  controller.abort()
  const gate = await budget(origin, {}, controller.signal)
  await fetch(`${gate.url}/responses`, { method: "POST" }).catch(() => {})
  expect(calls).toBe(0)
  expect(() => gate.check()).toThrow()
})
it("retains usage from the sole response when a token/tool continuation is denied", async () => {
  const origin = await listen(
    http.createServer((_req, res) => {
      res.end(
        'data: {"message":{"usage":{"input_tokens":7,"output_tokens":0}}}\n\ndata: {"usage":{"output_tokens":4}}\n\n',
      )
    }),
  )
  const gate = await budget(origin)
  await (await fetch(`${gate.url}/messages`, { method: "POST" })).text()
  await fetch(`${gate.url}/messages`, { method: "POST" }).catch(() => {})
  expect(() => gate.check()).toThrow(
    expect.objectContaining({ usage: { inputTokens: 7, outputTokens: 4 } }),
  )
})

it("does not report a provider request when the CLI cannot start", async () => {
  const { createLLMModel } = await import("../client.js")
  const { createProviderRegistry } = await import("../registry.js")
  const { codexProvider } = await import("../providers/codex/index.js")
  const { createCodexStructuredTextBackend } = await import("../providers/codex/structured-text.js")
  const { z } = await import("zod")
  const registry = createProviderRegistry()
    .register({
      ...codexProvider,
      resolveServerCredentials: () => ({}),
      createStructuredTextBackend: (context) =>
        createCodexStructuredTextBackend(context, { executable: "/nonexistent-adt-fixture/codex" }),
    })
    .freeze()
  const records: import("../log.js").LlmLogEntry[] = []
  const model = createLLMModel({
    modelId: "codex:gpt-4.1",
    registry,
    logLevel: "silent",
    onLog: (entry) => records.push(entry),
  })
  await expect(
    model.generateObject({
      schema: z.object({ ok: z.boolean() }),
      messages: [{ role: "user", content: "fixture" }],
      maxRetries: 0,
      log: { taskType: "fixture", promptName: "fixture" },
    }),
  ).rejects.toMatchObject({ providerCalls: 0 })
  expect(records).toEqual([expect.objectContaining({ providerCall: false, cacheHit: false })])
})

it.each([
  "BEDROCK",
  "VERTEX",
  "FOUNDRY",
  "ANTHROPIC_AWS",
  "ANTHROPIC_GOOGLE_CLOUD",
  "MANTLE",
  "GATEWAY",
])("rejects unsupported Claude %s routing before spawn or forwarding", async (backend) => {
  const { runClaudeCli } = await import("../providers/claude-agent/cli.js")
  const onProviderRequest = vi.fn()
  await expect(
    runClaudeCli({
      executable: "/must-not-spawn",
      model: "fixture",
      cwd: "/tmp",
      signal: new AbortController().signal,
      userMessage: {
        type: "user",
        message: { role: "user", content: [{ type: "text", text: "fixture" }] },
        parent_tool_use_id: null,
      },
      env: { [`CLAUDE_CODE_USE_${backend}`]: "1" },
      onProviderRequest,
    }),
  ).rejects.toMatchObject({ code: "unsupported-capability" })
  expect(onProviderRequest).not.toHaveBeenCalled()
})
