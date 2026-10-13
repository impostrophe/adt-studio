// @vitest-environment jsdom
import React, { type ReactNode } from "react"
import { afterEach, expect, it, vi } from "vitest"
import { renderHook, cleanup } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

vi.mock("@/api/client", () => ({ api: { updateBookConfig: vi.fn().mockResolvedValue({}), getBookConfig: vi.fn() } }))

const { useUpdateBookConfig } = await import("./use-book-config")
afterEach(() => cleanup())

it("refreshes output attention after a settings save, e.g. muting Easy Read read-aloud", async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const refresh = vi.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useUpdateBookConfig(), { wrapper })
  await result.current.mutateAsync({ label: "book", config: { speech: { excluded_categories: ["easy-read"] } } })
  expect(refresh).toHaveBeenCalledWith({ queryKey: ["books", "book", "outputs"] })
  client.clear()
})
