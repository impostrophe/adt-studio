// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { getDefaultStore } from "jotai"
import { pagesAtom, tocAtom } from "@/features/navigation/state/nav.atoms"
import { navigateToPage, prefetchPage } from "@/features/navigation/lib/page-swap"
import { TocContent } from "./TocDockContent"

vi.mock("@/features/navigation/lib/page-swap", () => ({ navigateToPage: vi.fn(), prefetchPage: vi.fn() }))
vi.mock("@/shared/hooks/use-is-mobile", () => ({ useIsMobile: () => false }))

afterEach(() => {
  cleanup()
  getDefaultStore().set(tocAtom, [])
  getDefaultStore().set(pagesAtom, [])
  vi.clearAllMocks()
})

describe("TOC unavailable destinations", () => {
  it("keeps an explicitly empty TOC empty even when pages remain", () => {
    getDefaultStore().set(pagesAtom, [{ section_id: "current", href: "current.html" }])
    render(<TocContent />)
    expect(screen.queryByRole("button", { name: "current" })).toBeNull()
  })

  it("retains authored headings without navigating or prefetching missing pages", () => {
    getDefaultStore().set(tocAtom, [
      { section_id: "retired", href: "", title: "Protected parent", chapter_id: "", level: 1 },
      { section_id: "current", href: "current.html", title: "Protected child", chapter_id: "", level: 2 },
    ])
    render(<TocContent />)
    const parent = screen.getByRole("button", { name: "Protected parent" }) as HTMLButtonElement
    expect(parent.disabled).toBe(true)
    fireEvent.click(parent)
    fireEvent.pointerEnter(parent)
    fireEvent.focus(parent)
    expect(navigateToPage).not.toHaveBeenCalled()
    expect(prefetchPage).not.toHaveBeenCalled()
    const child = screen.getByRole("button", { name: "Protected child" })
    fireEvent.focus(child)
    fireEvent.click(child)
    expect(prefetchPage).toHaveBeenCalledWith("current.html")
    expect(navigateToPage).toHaveBeenCalledWith("current.html")
  })
})
