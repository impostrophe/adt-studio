// @vitest-environment jsdom
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import type { SectioningSynchronization } from "@adt/types"

vi.mock("@lingui/react/macro", () => ({
  useLingui: () => ({ t: (strings: TemplateStringsArray, ...values: unknown[]) => strings.map((s, i) => s + (values[i] ?? "")).join("") }),
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("@tanstack/react-router", () => ({ Link: ({ children, params }: { children: React.ReactNode; params: { label: string; step: string; pageId: string } }) => <a href={`/books/${params.label}/${params.step}/${params.pageId}`}>{children}</a> }))
import { SectioningSyncNotice } from "./SectioningSyncNotice"

const snapshot: SectioningSynchronization = {
  sourceVersion: 2, renderingVersion: 1, layout: "reflowable", diagnostics: [],
  sections: [{ sectionId: "pg001_sec007", status: "unknown-origin", diagnostics: [] }],
}
afterEach(cleanup)
const notice = (s = snapshot) => <SectioningSyncNotice bookLabel="book" pageId="pg001" synchronization={s} showStoryboardLink />

describe("persistent synchronization notice", () => {
  it("lists stable identities with accessible review guidance and no rerender action", () => {
    render(notice())
    expect(screen.getByRole("status").textContent).toContain("pg001_sec007")
    expect(screen.getByText(/relationship.*unverified/)).toBeTruthy()
    expect(screen.getByRole("link").getAttribute("href")).toBe("/books/book/storyboard/pg001")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("survives unmount/reopen and an unverified new rendering version", () => {
    const first = render(notice())
    first.unmount()
    const next = render(notice())
    expect(screen.getByRole("status")).toBeTruthy()
    next.rerender(notice({ ...snapshot, renderingVersion: 2 }))
    expect(screen.getByRole("status").textContent).toContain("unverified")
    next.rerender(notice({ ...snapshot, sections: [{ ...snapshot.sections[0], status: "current" }] }))
    expect(screen.queryByRole("status")).toBeNull()
  })

  it("shows the persistent fixed-layout limitation and supported navigation", () => {
    render(notice({ ...snapshot, layout: "fixed", sections: [{ ...snapshot.sections[0], status: "fixed-layout-unmapped" }] }))
    expect(screen.getByRole("status").textContent).toContain("do not change the visible positioned page")
    expect(screen.getByRole("status").textContent).toContain("Rerendering semantic text cannot synchronize it")
    expect(screen.getByRole("link", { name: "Open Storyboard" })).toBeTruthy()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("handles invalid legacy data and older APIs without pretending they are current", () => {
    const view = render(notice({ ...snapshot, sections: [], diagnostics: ["invalid"] }))
    expect(screen.getByText(/Some source or rendering data/)).toBeTruthy()
    view.rerender(<SectioningSyncNotice bookLabel="book" pageId="pg001" />)
    expect(screen.queryByRole("status")).toBeNull()
  })
})
