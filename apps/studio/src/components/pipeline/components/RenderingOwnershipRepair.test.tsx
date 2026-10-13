// @vitest-environment jsdom
import React from "react"
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
const calls = vi.hoisted(() => ({ read: vi.fn(), repair: vi.fn(), dirty: false, running: false }))
vi.mock("@/api/client", () => ({ api: { getRenderingOwnership: calls.read, repairRenderingOwner: calls.repair } }))
vi.mock("@/hooks/use-book-run", () => ({ useBookRun: () => ({ isRunning: calls.running }) }))
vi.mock("./floating-save", () => ({ useFloatingSaveDirtyEntries: () => calls.dirty ? [{}] : [] }))
vi.mock("@/hooks/use-page-mutations", () => ({ invalidateStoryboardDependents: vi.fn() }))
vi.mock("@lingui/react/macro", () => ({ Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>, useLingui: () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) => strings.reduce((text, part, i) => text + part + (values[i] ?? ""), "") }) }))
const { RenderingOwnershipRepair } = await import("./RenderingOwnershipRepair")
const review = { renderingVersion: 3, sectioningNode: "page-sectioning", sectioningVersion: 4, unresolved: [{ renderingIndex: 1, rendering: { sectionIndex: 6, sectionType: "activity_custom_test", html: '<section data-section-id="old"><p>Original question</p><script>danger()</script></section>', reasoning: "", activityAnswers: { answer: "Retained answer" } } }], choices: [{ sectionId: "pg001_sec002", sectionType: "text", text: "Matching question" }] }
let client: QueryClient
afterEach(() => { cleanup(); client?.clear(); vi.resetAllMocks(); calls.dirty = false; calls.running = false })
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><RenderingOwnershipRepair bookLabel="book" pageId="pg001" /></QueryClientProvider>)
}
it("opens only on request and submits the reviewed versions and explicit choice; stale review needs reload", async () => {
  calls.read.mockResolvedValue(review)
  calls.repair.mockRejectedValueOnce(new Error("Content changed during ownership review")).mockResolvedValue({ version: 6 })
  mount()
  expect(calls.read).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Repair section ownership: pg001" }))
  await screen.findByRole("option", { name: "pg001_sec002 — Matching question" })
  const frame = screen.getByTitle("Retained rendering preview 2")
  expect(frame.getAttribute("sandbox")).toBe("")
  expect(frame.getAttribute("srcdoc")).toContain("default-src 'none'")
  expect(screen.getByText(/Retained answer/)).toBeTruthy()
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "pg001_sec002" } })
  fireEvent.click(screen.getByRole("button", { name: "Link retained content to selected section" }))
  await screen.findByRole("alert")
  expect(calls.repair).toHaveBeenLastCalledWith("book", "pg001", { renderingIndex: 1, sectionId: "pg001_sec002", renderingVersion: 3, sectioningNode: "page-sectioning", sectioningVersion: 4 })
  expect(screen.getByText(/Retained answer/)).toBeTruthy()
  calls.read.mockResolvedValue({ ...review, renderingVersion: 5 })
  fireEvent.click(screen.getByRole("button", { name: "Reload ownership review" }))
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
  await waitFor(() => expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(""))
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "pg001_sec002" } })
  calls.read.mockResolvedValue({ ...review, renderingVersion: 6, unresolved: [] })
  fireEvent.click(screen.getByRole("button", { name: "Link retained content to selected section" }))
  await screen.findByText("Every rendering on this page has a verified owner.")
  expect(calls.repair.mock.calls[1][2]).toMatchObject({ renderingVersion: 5 })
})
it.each(["dirty", "running"] as const)("blocks ownership writes during %s work", async reason => {
  calls[reason] = true
  calls.read.mockResolvedValue(review)
  mount()
  fireEvent.click(screen.getByRole("button", { name: "Repair section ownership: pg001" }))
  await screen.findByRole("combobox")
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "pg001_sec002" } })
  expect(screen.getByRole("button", { name: "Link retained content to selected section" }).hasAttribute("disabled")).toBe(true)
  expect(calls.repair).not.toHaveBeenCalled()
})

it.each(["rendering", "source-node"])("requires a fresh explicit choice after background %s changes", async kind => {
  calls.read.mockResolvedValue(review)
  mount()
  fireEvent.click(screen.getByRole("button", { name: "Repair section ownership: pg001" }))
  await screen.findByRole("combobox")
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "pg001_sec002" } })
  calls.read.mockResolvedValue({ ...review, ...(kind === "rendering" ? { renderingVersion: 5, unresolved: [{ ...review.unresolved[0], rendering: { ...review.unresolved[0].rendering, html: "<p>Different retained content</p>" } }] } : { sectioningNode: "fixed-layout-sectioning" }) })
  await client.invalidateQueries({ queryKey: ["books", "book", "pages"] })
  await waitFor(() => expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(""))
  expect(screen.getByRole("button", { name: "Link retained content to selected section" }).hasAttribute("disabled")).toBe(true)
  expect(calls.repair).not.toHaveBeenCalled()
})
