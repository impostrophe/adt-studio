# SPEC-0012 implementation evidence

This is the first, read-only rollout slice of SPEC-0012, not the full implementation.
The specification remains in review, with no approvers. Implementation before
approval was explicitly authorized on 2026-09-25. No release verification is claimed.

## Refreshed inputs and dependency decision

- Base: develop `737d3314`; published #888: `b850875c` (preserved as
  `backup/spec-0012-published-20260925`). Rebased only its spec and INDEX row onto
  develop, dropping the unrelated inherited documentation stack.
- Read complete published spec, #515/#580/#731 and their comments, #888/#581
  discussions and inline reviews (none), and #879/#880 review feedback.
- #879 `375081fc`, #880 `5eeaab68`, #884 `04250fda` are documentation only.
  Local #884/#886 worktrees also have no committed implementation of the shared
  writer admission. #887 prompt persistence is not an implementation prerequisite.
- Current `saveStoryboardNode` still calls book-wide `clearCaptionData`;
  the atomic Storyboard route exists but has no expected source/render version
  contract, shared writer admission or protection/freshness metadata. The task
  service is independent of pipeline step admission. #731 force-fresh behavior
  is absent from the rerender service and model options.
- Therefore automatic propagation, transactional save integration and targeted
  repair cannot be enabled without bypassing missing shared dependencies.
  Use the spec's explicit classifier/read-projection rollout and retain notices.
  Do not introduce a parallel freshness database, provenance inference or repair
  subsystem. Existing mutation behavior is outside this slice and remains unsafe
  for the full preservation promise; #515 and #580 remain open.
- Firm references: supplied V1 roadmap (8 September), SDD proposal, current
  AGENTS/GUIDELINES/ARCHITECTURE/INVARIANTS and ADRs 001–004, 008–010, 017–018,
  022. The current request overrides approval-before-code sequencing only.
- Starting point: #581 `8d077980`, authored by Kemal Sokolovic. Adapt its pure
  classify-before-write approach, read/save separation and fixture scenarios.
  Do not copy its index association, blanket HTML normalization, post-commit
  best-effort write or unguarded repair. Existing PR #581 is unchanged.

## Pre-edit acceptance map

Every criterion is mapped before implementation. Status/evidence will be updated
following verification; rows below describe current behavior and intended checks.

| AC | Current behavior / required change | Concrete verification and initial disposition |
|---|---|---|
| 1 | No save propagation. Build a pure candidate patcher; activation depends on shared protection/admission. | Escaped text replacement and zero provider calls in pure tests; stored/preview sync blocked. |
| 2 | #581 normalizes all HTML. Replace only proven text spans, retaining all other bytes. | Exact HTML/image/script/neighbor equality, frozen inputs. |
| 3 | Existing validator rewrites/normalizes accepted HTML. Reuse optional-text rules, protect ambiguous markup. | Entities, placeholders, blank markers, optional IDs, nested containers/activity IDs; markup injection tests. |
| 4 | Render arrays expose positional indices. Use exact HTML section identity and verified page ownership only. | Reorder/sparse/duplicate/cross-page/stale-index fixtures. |
| 5 | GET has no synchronization projection. Classify structural/missing/malformed output read-only. | API + pure drift fixtures and unchanged stored HTML. |
| 6 | No rendering provenance. Never infer generated origin from matching text or timestamps. | Matching legacy output remains unknown; manual divergence preserved with explicit proof fixtures. |
| 7 | Atomic endpoint exists but invalidation is destructive and admission incomplete. | Blocked pending shared mechanisms; no new mutation path. |
| 8 | Existing save succeeds but reports no drift. | Blocked response integration; GET after save can report drift independently. |
| 9 | Atomic endpoint writes submitted nodes even when identical. | Blocked save deduplication; candidate idempotency tested independently. |
| 10 | Pipeline-running guard only; no expected versions or shared task/CLI admission. | Blocked, no new save/repair path. |
| 11 | GET selects current pointers but has no drift. Add read-only snapshot projection. | Real SQLite reopen/imported copy/restored pointers; all node rows/pointers/media unchanged by GET. |
| 12 | Existing tasks cannot establish trusted correspondence. Do not clear on task events. | UI retains server notice across task/refetch outcomes; full repair lifecycle blocked. |
| 13 | Shared protection/mode/cache policies absent. | Blocked; no repair action offered. |
| 14 | Fixed-layout semantic editor has no persistent boundary notice. | API fixed-layout fixture, accessible Studio explanation/link, no sync rerender. |
| 15 | Saves clear book-wide downstream nodes. | Blocked on SPEC-0001/0002; read-only slice must preserve all rows/assets. |
| 16 | Positional consumers risk retired identity reuse. Classifier never redirects by index. | Restored/retired/successor ID fixtures; notices link to page review only. |
| 17 | Existing saves invalidate page/preview queries. Add server-driven accessible notices in both editors. | Studio render/navigation/refetch tests, five-locale extraction/lint; full save contract blocked. |
| 18 | Spec-only metadata. Document actual slice and limits without checking unsupported ACs. | Final diff/spec/INDEX/PR description review; no approval/release/issue closure claim. |

## Verification results

Pending implementation and checks. No acceptance criterion is marked complete yet.
