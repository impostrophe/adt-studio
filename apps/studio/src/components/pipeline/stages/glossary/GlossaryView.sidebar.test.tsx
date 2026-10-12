// @vitest-environment jsdom
import React, { createContext, useContext, useState, type ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const join = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce((text, part, index) => text + part + (index < values.length ? String(values[index]) : ""), "")

// Vitest does not compile Lingui macros.
vi.mock("@lingui/core/macro", () => ({
  msg: (strings: TemplateStringsArray, ...values: unknown[]) => ({ message: join(strings, ...values) }),
}))
vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLingui: () => ({ t: join, i18n: { _: (d: { message: string }) => d.message } }),
}))

const glossary = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  items: [{ id: "gl001", word: "Nile", definition: "A river in Africa", variations: [], emojis: [], source: "ai" }],
}
const HeaderContext = createContext<{ setExtra: (extra: ReactNode) => void }>({ setExtra: () => {} })
vi.mock("../../components/StepViewRouter", () => ({ useStepHeader: () => useContext(HeaderContext) }))
vi.mock("@/hooks/use-glossary", () => ({ useGlossary: () => ({ data: glossary, isLoading: false }) }))
vi.mock("@/hooks/use-sign-language-videos", () => ({
  useSignLanguageVideos: () => ({ data: { videos: [] } }),
  useUploadSignLanguageVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useAssignSignLanguageVideo: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteSignLanguageVideo: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock("@/hooks/use-book-run", () => ({ useBookRun: () => ({ stageState: () => "done", queueRun: vi.fn() }) }))
vi.mock("@/hooks/use-api-key", () => ({ useApiKey: () => ({ apiKey: "" }), useBookStructuredTextAvailability: () => true }))
vi.mock("../../components/StageRunCard", () => ({ StageRunCard: () => null }))
vi.mock("../../components/VersionPicker", () => ({
  VersionPicker: ({ onSave, dirty }: { onSave: () => void; dirty: boolean }) => <button type="button" disabled={!dirty} onClick={onSave}>Save</button>,
}))
vi.mock("./AddGlossaryDialog", () => ({ AddGlossaryDialog: () => null }))
vi.mock("./components/GlossaryImagePickerDialog", () => ({ GlossaryImagePickerDialog: () => null }))
vi.mock("./components/GlossaryHintBanner", () => ({ GlossaryHintBanner: () => null }))
vi.mock("./lib/occurrences", () => ({ useGlossaryOccurrences: () => ({ byItem: new Map(), isLoading: false }) }))
vi.mock("@/api/client", () => ({ api: { updateGlossary: vi.fn() }, BASE_URL: "", getSignLanguageVideoUrl: () => "" }))

const { api } = await import("@/api/client")
const { TooltipProvider } = await import("@/components/ui/tooltip")
const { GlossaryView } = await import("./GlossaryView")
let client: QueryClient

function Harness() {
  const [extra, setExtra] = useState<ReactNode>(null)
  return <HeaderContext.Provider value={{ setExtra }}>
    <header>{extra}</header>
    <GlossaryView bookLabel="book" />
  </HeaderContext.Provider>
}

async function editAndSave() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const refresh = vi.spyOn(client, "invalidateQueries")
  render(<QueryClientProvider client={client}><TooltipProvider><Harness /></TooltipProvider></QueryClientProvider>)
  fireEvent.change(await screen.findByLabelText("Definition for Nile"), { target: { value: "The longest river in Africa" } })
  fireEvent.click(await screen.findByRole("button", { name: "Save" }))
  await waitFor(() => expect(api.updateGlossary).toHaveBeenCalled())
  await waitFor(() => expect(refresh).toHaveBeenCalledWith({ queryKey: ["books", "book", "glossary"] }))
  return refresh.mock.calls.filter(([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(["books", "book", "outputs"])).length
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} })
})
afterEach(() => {
  cleanup()
  client?.clear()
  vi.unstubAllGlobals()
})

describe("sidebar attention after a glossary save", () => {
  it.each([false, true])("refreshes Language and Speech attention exactly once (image requirements changed: %s)", async (imageRequirementsChanged) => {
    vi.mocked(api.updateGlossary).mockResolvedValue({ version: 2, imageRequirementsChanged })
    expect(await editAndSave()).toBe(1)
  })
})
