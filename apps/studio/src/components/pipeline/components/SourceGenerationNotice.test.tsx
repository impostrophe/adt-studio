// @vitest-environment jsdom
import React, { type ReactNode } from "react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
const state = vi.hoisted(() => ({ stages: ["toc"], running: false, cancelling: false, dirty: false, provider: true, queue: vi.fn() }))
vi.mock("@lingui/react/macro", () => ({ Trans: ({ children }: { children: ReactNode }) => <>{children}</> }))
vi.mock("@/hooks/use-book-run", () => ({ useBookRun: () => ({ sourceUpdateStages: state.stages, isRunning: state.running, isCancelling: state.cancelling, queueRun: state.queue }) }))
vi.mock("@/hooks/use-api-key", () => ({ useApiKey: () => ({ apiKey: "test-key" }), useBookStructuredTextAvailability: () => state.provider }))
vi.mock("./floating-save", () => ({ useHasUnsavedChanges: () => state.dirty }))
import { SourceGenerationNotice } from "./SourceGenerationNotice"
beforeEach(() => { state.stages = ["toc"]; state.running = false; state.cancelling = false; state.dirty = false; state.provider = true; state.queue.mockClear() })
afterEach(cleanup)
it.each(["quizzes", "glossary", "toc"])("offers an explicit stage-only Re-run above retained %s content", stage => {
  state.stages = [stage]
  render(<><SourceGenerationNotice bookLabel="book" stage={stage} /><p>Retained content</p></>)
  expect(screen.getByRole("status").textContent).toContain("Generated before your latest edits")
  expect(screen.getByText("Retained content")).toBeTruthy()
  expect(state.queue).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole("button", { name: "Re-run" }))
  expect(state.queue).toHaveBeenCalledExactlyOnceWith({ fromStage: stage, toStage: stage, apiKey: "test-key", viewAfter: true })
})
it.each(["running", "cancelling", "dirty", "provider"] as const)("keeps the warning and prevents unsafe generation when blocked by %s", condition => {
  state[condition] = condition !== "provider"
  render(<SourceGenerationNotice bookLabel="book" stage="toc" />)
  const button = screen.getByRole("button", { name: "Re-run" }) as HTMLButtonElement
  expect(button.disabled).toBe(true)
  fireEvent.click(button)
  expect(state.queue).not.toHaveBeenCalled()
  expect(screen.getByRole("status")).toBeTruthy()
})
it("keeps the warning across active-run transitions, removing it only when the persisted update state clears", () => {
  const view = render(<SourceGenerationNotice bookLabel="book" stage="toc" />)
  state.running = true; view.rerender(<SourceGenerationNotice bookLabel="book" stage="toc" />)
  expect(screen.getByRole("status")).toBeTruthy()
  state.running = false; view.rerender(<SourceGenerationNotice bookLabel="book" stage="toc" />)
  expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false)
  state.stages = []; view.rerender(<SourceGenerationNotice bookLabel="book" stage="toc" />)
  expect(screen.queryByRole("status")).toBeNull()
})
it("does not show a source generator warning on another stage", () => {
  render(<SourceGenerationNotice bookLabel="book" stage="speech" />)
  expect(screen.queryByRole("status")).toBeNull()
})
