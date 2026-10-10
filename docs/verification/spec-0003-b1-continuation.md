# SPEC-0003 B1 continuation audit

Started 2026-10-10 against published PR #884 head `e3737abe`.
Human approval remains pending. This audit does not amend the acceptance criteria.

## Pre-edit acceptance map

The historical reports are hypotheses to verify on the integrated head. `L` means
`apps/api/src/services/sectioning-lifecycle.test.ts`, `R` means
`apps/api/src/services/sectioning-preflight-runners.test.ts`, `P` means
`packages/pipeline/src/__tests__/sectioning-preflight.test.ts`, `U` means
`apps/studio/src/hooks/use-sectioning-mode-confirmation.test.tsx`, `W` means
`packages/storage/src/__tests__/book-writer.test.ts`, and `C` means
`packages/pipeline/src/__tests__/page-sectioning.test.ts`.

| AC | Current source behavior / required work | Concrete verification |
|---|---|---|
| 1 | Effective Dynamic → Page uses derived completion invalidation; retain | L: affected completion closure |
| 2 | Reverse transition uses the same closure; retain | L: Page → Dynamic |
| 3 | Extract is outside the closure; retain | L: unchanged extraction rows/assets |
| 4 | Mode save creates no content versions; retain | L: histories/pointers/media snapshots |
| 5 | Effective equality avoids invalidation; retain | L: same-mode save |
| 6 | Unrelated updates avoid mode invalidation; retain | L and U: adjacent saves |
| 7 | Shared writer plus active work checks; audit recovery reservation race | L/W: HTTP 409, independent process, no writes |
| 8 | Existing dialog covers retained/completed output; retain | U: rendered dialog |
| 9 | Cancel does not submit; retain | U: mutation count |
| 10 | Failure refetches authoritative config; retain | U: conflict and ambiguous response |
| 11 | Query refresh includes current-state indicators; retain | U/L: refetch and read-model state |
| 12 | Missing persisted input blocks By Page; review proposes incompatible amendment | P/R: missing active page, no calls |
| 13 | Empty persisted input blocks By Page; same unresolved amendment | P/R: empty sections |
| 14 | Multi-section input blocks By Page; same unresolved amendment | P/R: multiple sections |
| 15 | Publication buffers then commits atomically; fix active render-tree switching | R/L: cancellation, SQLite abort, unchanged prior tree/HTML |
| 16 | Valid By Page publishes if lifecycle is current; fix fixed → reflowable tree selection | R: successful layouts and downstream resolver |
| 17 | Dynamic permits multiple sections; retain | P/R: positive Dynamic publication |
| 18 | Historical input is checked; unknown lifecycle fails closed | P/L/R: legacy, null, malformed, historical versions |
| 19 | Shared guard exists, but existing-book regeneration/resume is rejected | R: API/queue/targeted/part positives; CLI safe refusal; full chain blocked by absent preservation |
| 20 | Five locales exist; reconcile develop catalog updates | Lingui extraction/compile and Studio lint |
| 21 | No B1 dependency additions required | Diff package manifests/lockfile against develop |
| 22 | Resolver handles inheritance/removal and schema rejection | L: global defaults, removal, invalid value |
| 23 | Mode journal recovers; ordinary anonymous DB mutex fails closed | L/W: fault boundaries and SIGKILL, retained recovery bytes |
| 24 | Execution/publication revalidation exists; include active positioned tree in snapshot | L/R/W/U: queued changes, positioned-tree edits, competing writer and adjacent saves |
| 25 | Structured full count with 20 displayed page identities | P/R: bounded translated failure details |
| 26 | Reuses #692's validator/cache path | C: counted provider transport calls, invalid eviction/retry and valid reuse |

## Published prerequisites and review conflict

- Current develop: `ef31494d`; target base previously `737d3314`.
- SPEC-0001 #879: `a1fc11a2`, four documentation files only. Its usable downstream
  warnings apply to captions/easy-read/translation/speech; Storyboard freshness is
  explicitly excluded. They do not by themselves amend SPEC-0003's mode gate.
- SPEC-0002 #880: `d2348233`, specification only (stacked on an older SPEC-0001).
  Unknown authorship is now protected in the proposal, but the shared preservation
  foundation and Sectioning replacement implementation are absent.
- SPEC-0010 #886: `876cc2ae`, published safe extraction/reuse implementation. Its
  downstream executor still returns `UNSAFE_RESUME_UNAVAILABLE`; verified
  extraction alone cannot enable AC-19. Inspect and adapt applicable shared writer
  fixes with attribution; do not duplicate its extraction subsystem here.
- SPEC-0012 #888: `b850875c`, published specification only. Local unpublished work
  in other checkouts is not a dependency.
- Reuses merged #692 by @KaReeeeeeeeEM; no modifications to that PR.

[The September 30 review](https://github.com/unicef/adt-studio/pull/884#pullrequestreview-5368403884)
proposes warnings/page skips instead of AC-12–16 rejection, informational lifecycle
metadata, per-page publication, no preview/export lifecycle gate and an in-process
lock. Those are material changes to the published contract, especially supported
cross-process admission. The current task explicitly requests the published spec,
incompatible-output protection and recovery evidence. Clarification was requested;
no amendment or approval is inferred from the review. Fixes that are correct under
both contracts can proceed independently.

The target's original head is preserved as
`backup/spec-0003-before-b1-continuation-20261010`. The primary checkout and other
implementation checkouts are untouched. No push, replacement PR or merge is
authorized by this continuation.
