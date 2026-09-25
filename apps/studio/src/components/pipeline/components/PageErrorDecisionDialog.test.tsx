// @vitest-environment jsdom
// Dialog harness adapted from PR #712.
import React from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PageErrorDecisionDialog } from "./PageErrorDecisionDialog"

const resolveDecision = vi.fn()
const refreshDecisions = vi.fn()
const pendingDecisions = [
  {
    decisionId: "decision-1",
    runId: "run-1",
    step: "image-meaningfulness",
    pageId: "pg002",
    error: "Provider connection closed",
    canRetry: false,
    errorClass: "connection-closed",
    attemptCount: 3,
  },
]
vi.mock("@lingui/react", () => ({
  useLingui: () => ({ i18n: { _: (value: { id?: string }) => value?.id ?? String(value) } }),
}))
vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock("@lingui/core/macro", () => ({
  msg: (strings: TemplateStringsArray) => ({ id: strings.join("") }),
}))
vi.mock("@/hooks/use-book-run", () => ({
  useBookRun: () => ({ pendingDecisions, resolveDecision, refreshDecisions }),
}))
vi.mock("../pipeline-i18n", () => ({ getStepLabelI18n: () => "Image Meaningfulness" }))
const initialDecision = { ...pendingDecisions[0] }
beforeEach(() => {
  pendingDecisions.splice(0, pendingDecisions.length, { ...initialDecision })
  resolveDecision.mockReset()
  refreshDecisions.mockReset()
})
afterEach(cleanup)

describe("safe decision dialog", () => {
  it("shows page, attempts and translated classification without promising unavailable Retry", () => {
    render(<PageErrorDecisionDialog />)
    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(screen.getByText(/pg002/)).toBeTruthy()
    expect(screen.getByText("Connection closed")).toBeTruthy()
    expect(screen.getByText("Attempts made: 3")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull()
  })
  it("disables duplicate actions until the server answers", async () => {
    let finish!: () => void
    resolveDecision.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    render(<PageErrorDecisionDialog />)
    const stop = screen.getByRole("button", { name: "Stop step" })
    fireEvent.click(stop)
    fireEvent.click(stop)
    expect(resolveDecision).toHaveBeenCalledTimes(1)
    expect((stop as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true)
    finish()
    await waitFor(() => expect((stop as HTMLButtonElement).disabled).toBe(false))
  })
  it("keeps the dialog with an accessible explanation and refresh action after rejection", async () => {
    resolveDecision.mockRejectedValue(new Error("409 stale"))
    render(<PageErrorDecisionDialog />)
    fireEvent.click(screen.getByRole("button", { name: "Skip page and continue" }))
    await screen.findByRole("alert")
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Refresh status" }))
    expect(refreshDecisions).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("409 stale")).toBeNull()
  })
})

it("does not let a previous decision response unlock or report failure on the next decision", async () => {
  let rejectFirst!: (error: Error) => void
  let finishSecond!: () => void
  resolveDecision
    .mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectFirst = reject
        }),
    )
    .mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSecond = resolve
        }),
    )
  const { rerender } = render(<PageErrorDecisionDialog />)
  fireEvent.click(screen.getByRole("button", { name: "Stop step" }))
  // Another tab resolves the first decision; polling advances this dialog while
  // this tab's original POST is still in flight.
  pendingDecisions.splice(0, 1, { ...initialDecision, decisionId: "decision-2", pageId: "pg003" })
  rerender(<PageErrorDecisionDialog />)
  const nextStop = screen.getByRole("button", { name: "Stop step" })
  fireEvent.click(nextStop)
  expect(resolveDecision).toHaveBeenCalledTimes(2)
  await act(async () => {
    rejectFirst(new Error("409 already resolved"))
  })
  expect((nextStop as HTMLButtonElement).disabled).toBe(true)
  expect(screen.queryByRole("alert")).toBeNull()
  fireEvent.click(nextStop)
  expect(resolveDecision).toHaveBeenCalledTimes(2)
  finishSecond()
  await waitFor(() => expect((nextStop as HTMLButtonElement).disabled).toBe(false))
})
