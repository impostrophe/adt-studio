// @vitest-environment jsdom
import React from "react"
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

const { state } = vi.hoisted(() => ({ state: { items: [] as { id: string; word: string }[] } }))
vi.mock("@/hooks/use-stage-status", () => ({ useStageStatus: () => ({ isCompleted: false, isRunning: false }) }))
vi.mock("@/hooks/use-glossary", () => ({ useGlossary: () => ({ data: { items: state.items } }) }))
vi.mock("./GlossaryView", () => ({ GlossaryView: () => <div>Retained glossary editor</div> }))
vi.mock("./GlossaryLandingPage", () => ({ GlossaryLandingPage: () => <div>Generate glossary</div> }))
import { GlossaryIndex } from "./GlossaryIndex"

afterEach(cleanup)
it.each([false, true])("routes an idle glossary to its saved content when present (%s)", (retained) => {
  state.items = retained ? [{ id: "gl001", word: "Root" }] : []
  render(<GlossaryIndex bookLabel="book" />)
  expect(screen.queryByText("Retained glossary editor") !== null).toBe(retained)
  expect(screen.queryByText("Generate glossary") !== null).toBe(!retained)
})
