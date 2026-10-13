// @vitest-environment jsdom
import React, { type ReactNode } from "react"
import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import type { OutputStatus } from "@adt/types"

const calls = vi.hoisted(() => ({ save: vi.fn(), page: vi.fn(), outputs: vi.fn() }))
vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
  useLingui: () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((text, part, index) => text + part + (values[index] ?? ""), ""), i18n: { locale: "en" } }),
}))
vi.mock("@/api/client", () => ({ BASE_URL: "", api: { updateImageCaptioning: calls.save, getOutputs: calls.outputs } }))
vi.mock("@/hooks/use-pages", () => ({
  usePage: (label: string, pageId: string) => useQuery({ queryKey: ["books", label, "pages", pageId], queryFn: calls.page, staleTime: Infinity }),
  usePageImage: () => ({ data: undefined }),
}))
vi.mock("@/hooks/use-api-key", () => ({ useApiKey: () => ({ apiKey: undefined }) }))
vi.mock("@/hooks/use-stage-status", () => ({ useStageStatus: () => ({ isRunning: false }) }))
vi.mock("@/hooks/use-book-run", () => ({ useBookRun: () => ({ isRunning: false }) }))
vi.mock("../../../pipeline-i18n", () => ({ getStageLabelI18n: (value: string) => value }))
vi.mock("../../../components/VersionPicker", () => ({ VersionPicker: () => null }))
vi.mock("../../../components/floating-save", () => ({ PendingChip: () => null, useFloatingSaveDirtyEntries: () => [] }))
vi.mock("./Lightbox", () => ({ Lightbox: () => null }))

const { PageCaptions } = await import("./PageCaptions")
let client: QueryClient
afterEach(() => { cleanup(); client?.clear(); vi.resetAllMocks() })

it("keeps the edited caption and its pill until both content and output-status refetches finish", async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const caption = { imageId: "pg001_im001", caption: "Original caption", reasoning: "", source: "ai" }
  const initialPage = { versions: { imageCaptioning: 1 }, captionSourceSignature: "source", imageCaptioning: { captions: [caption] } }
  const output: OutputStatus = {
    identity: { kind: "caption", id: caption.imageId }, signature: "source", contentHash: "old",
    usable: true, current: true, protected: false, manual: false, excluded: false, missing: false,
    updateNeeded: false, warnings: [], pageIds: ["pg001"], sectionIds: [],
  }
  client.setQueryData(["books", "book", "pages", "pg001"], initialPage)
  client.setQueryData(["books", "book", "outputs", false, undefined], { outputs: [output] })
  calls.save.mockResolvedValue({ version: 2 })
  let releasePage!: () => void
  let releaseOutputs!: () => void
  calls.page.mockImplementation(() => new Promise((resolve) => {
    releasePage = () => resolve({ ...initialPage, versions: { imageCaptioning: 2 }, imageCaptioning: { captions: [{ ...caption, caption: "My correction", source: "manual" }] } })
  }))
  calls.outputs.mockImplementation(() => new Promise((resolve) => {
    releaseOutputs = () => resolve({ outputs: [{ ...output, text: "My correction", manual: true, protected: true }] })
  }))
  render(<QueryClientProvider client={client}>
    <PageCaptions bookLabel="book" pageId="pg001" pageNumber={1} decorativeFilter="all" searchQuery="" toolbarHeight={0} />
  </QueryClientProvider>)
  fireEvent.click(screen.getByTitle("Click to edit caption"))
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "My correction" } })
  fireEvent.click(screen.getByRole("button", { name: "Done" }))
  await waitFor(() => expect(calls.page).toHaveBeenCalledTimes(1))
  expect(screen.getByText("My correction")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Caption: Unsaved edit" })).toBeTruthy()
  await act(async () => releasePage())
  await waitFor(() => expect(calls.outputs).toHaveBeenCalledTimes(1))
  // The page is saved but the output read model still contains its old AI row.
  expect(screen.getByRole("button", { name: "Caption: Unsaved edit" })).toBeTruthy()
  expect(screen.queryByText("Original caption")).toBeNull()
  await act(async () => releaseOutputs())
  await waitFor(() => expect(screen.getByRole("button", { name: "Caption: Edited manually" })).toBeTruthy())
  expect(screen.getByText("My correction")).toBeTruthy()
})
