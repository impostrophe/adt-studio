# SPEC-0003 product-review reconciliation — 2026-10-12

Prepared before spec/runtime edits at `a5670d46`. Prerequisite `09f0d1c7` (runtime `7b53e448`), including SPEC-0001 `aefe4185`; develop `410d4b2f`. Original SPEC-0003 increment is `373619dd..a5670d46` (21 commits); the new prerequisite rewrote its ancestors, so the merge-base is not the replay boundary. Reviews [5486273946](https://github.com/unicef/adt-studio/pull/884#pullrequestreview-5486273946) and [5368403884](https://github.com/unicef/adt-studio/pull/884#pullrequestreview-5368403884) were read in full. Latest review supersedes incompatible active coexistence. This is a requirement/verification plan, not passing evidence or approval.

## Original acceptance mapping

Original wording is retained verbatim here; superseded blocking tests do not certify the new contract.

| Original AC and requirement | Disposition | Revised contract | Entry points and verification |
|---|---|---|---|
| AC-1: Dynamic to By Page invalidates Sectioning and every downstream step. | Revised | Preference change is informational; no content freshness or usability invalidation. | Mode PUT/inherited config → state/readers; content, attempt records and hashes unchanged. |
| AC-2: By Page to Dynamic invalidates the same dependency closure. | Revised | Same rule in reverse. | Reverse PUT/removal of override and external defaults; all status consumers agree. |
| AC-3: Extract completion and extracted data remain unchanged. | Retained | Extract is unchanged. | Compare Extract runs, PDF/image bytes, page identities in all transition/reset cases. |
| AC-4: Every existing content version and referenced media byte survives a mode change. | Retained | Keep every version and physical asset. | Real SQLite/history/filesystem snapshots before/after saves, resets and recovery. |
| AC-5: Saving an unchanged effective mode causes no invalidation. | Retained | No-op effective preference does nothing. | No-op PUT, no provider calls or new entity versions. |
| AC-6: An unrelated config edit causes no mode invalidation. | Retained | Unrelated config remains independent. | Adjacent config saves; cosmetic HTML Save preserves catalog freshness/attempts. |
| AC-7: A mode transition during active/conflicting work returns 409 with no mutation. | Retained with shared guard | Conflicting writer rejects before change; reuse prerequisite admission. | HTTP/queued/independent-process writer races, 409 and unchanged snapshots. |
| AC-8: Studio confirms a transition when retained or completed downstream output exists. | Revised | Mode confirmation explains preference only; replacement has separate default-off consent. | Mounted dialog/browser mode cancel/confirm, named Sectioning and render snapshots. |
| AC-9: Cancel leaves configuration unchanged and sends no mutation request. | Retained | Cancel before confirmation changes nothing. | No HTTP mutation/provider call; exact stored state unchanged. |
| AC-10: A failed update restores/refetches the persisted selection and surfaces the error. | Retained | Failed save restores authoritative selection and keeps drafts. | HTTP failure/stale query/navigation component tests. |
| AC-11: Successful transitions refresh config, debug config, step and relevant page/stage state. | Revised | Refresh preference diagnostics separately from actual usable-output coverage. | Library/sidebar/stage/preview/export after inherited and direct saves. |
| AC-12: By Page preflight rejects a missing latest Sectioning result. | Superseded | Missing/unreadable page input is reported per page; other pages render. | Mixed real-storage API/queued run; missing page retained, successful neighbor published. |
| AC-13: By Page preflight rejects zero sections. | Superseded | Empty saved trees are valid edits; warn, no count gate. | Delete-last in By Page, empty-page reporting and unrelated targeted rendering. |
| AC-14: By Page preflight rejects multiple sections. | Superseded | Multiple saved sections remain renderable in By Page. | Split/add/clone/merge saves → actual full/targeted rendering. |
| AC-15: Any preflight failure preserves all rendering versions and starts no rendering call. | Revised | Ordinary runs publish successful pages immediately; failed pages keep prior output. | Slow second page, API availability; failure/Skip/cancel; per-page rollback. |
| AC-16: Exactly one valid section per source page permits Storyboard subject to other prerequisites. | Retained and broadened | Render any valid saved tree; enforce count only at generation/cache boundary. | Fixed/reflowable one/multiple sections; retain HTML/reading-order validators. |
| AC-17: Dynamic mode continues to accept multiple sections. | Retained | Dynamic accepts multiple or single saved sections. | Generation and saved-tree rendering regressions. |
| AC-18: Historical/imported inconsistencies are caught without an observed config transition. | Superseded | Legacy lifecycle is informational unknown, never an initialization gate. | Older fixture opens/renders/exports without bookkeeping run; zero calls for read/reuse. |
| AC-19: API, queued, targeted and DAG/CLI paths enforce the same rule, including fixed layout. | Revised, CLI scope deferred | Immediate/queued/targeted/combined app paths share policy; fresh CLI uses valid generation, existing-book resume deferred. | Public API/worker/DAG fresh-book tests; existing CLI safe refusal before mutation/calls. |
| AC-20: All new UI copy is translated in the five supported locales. | Expanded | All changed UI and HTTP/SSE errors translate in five locales. | Error-code/parameter mapper tests, extraction, strict compile, browser. |
| AC-21: The implementation adds no dependencies. | Retained | No new dependency. | Manifest/lock diff against refreshed prerequisite. |
| AC-22: Effective override removal/default resolution is correct; invalid modes change nothing. | Retained | Use effective defaults/override removal; invalid mode changes nothing. | Real config resolver and PUT validation. |
| AC-23: Injected file/DB failures and restart at each journal boundary never expose new mode with old current status. | Revised | Journaled config and atomic reset recovery cannot falsely claim completion. | Injected failures, process death/reopen; ambiguous SQLite mutex retained, no timeout deletion. |
| AC-24: Admission races and post-preflight edits cannot publish output based on obsolete configuration or section versions. | Retained | Revalidate exact source/render/config at execution and publication. | Stale confirmation, queued edits, external writer and late result rejection. |
| AC-25: Errors contain the full failure count and at most 20 displayed page identities, including malformed/null results. | Revised | Bound informational page diagnostics and per-page missing/error reports with total counts. | Malformed/null/empty/multiple mixed pages, >20 identities; translated reports. |
| AC-26: Invalid cached multi-section responses follow #692's eviction/retry behavior; valid cache reuse remains possible. | Retained | Keep #692 invalid-cache eviction/retry and valid cache reuse. | Actual stub transport and filesystem cache counts; generation validator unchanged. |

## Feedback-to-fix plan

| Feedback | Current behavior at original head | Required correction and evidence |
|---|---|---|
| Critical A | Shared persisted preflight rejects intentional multi-section By Page trees, including unrelated targeted work | Remove cardinality/lifecycle admission; retain generation validator and schema/HTML validators. Full and targeted split/add cases. |
| R1 | Publication clears whole-book pending using page IDs, not included-section coverage | Derive actual safe rendered ownership/coverage; partial patch cannot complete Storyboard/package. Public status, output and package readers agree. |
| R2 | First lifecycle record can legitimize retained old HTML | Explicit reset deactivates active HTML/tree independently of lifecycle metadata; history never counts as new output. |
| R3 | External/inherited modes disagree with done status | One informational preference projection; no lifecycle masking of content/attempt state or preview/export. |
| R4 | HTTP/SSE messages bypass localized mapping | Structured remaining codes/parameters and common Studio translation; remove obsolete errors. |
| R5 | All output staged until final all-success publication | Ordinary per-page atomic publication; slow page API/browser evidence, failure/Skip/cancel persistence. Whole-window atomic publication only for actual layout switch. |
| R6 | Structural operations shift old rendering indexes against new semantic tree | Explicit reset plus stable-owner projection for structural operations; split/clone/merge/delete retain history/bounds. |
| Older books / output gates | Missing lifecycle and mode/provenance block usable books | Remove mode-only gates. Keep inherited unresolved-owner omission/warnings and genuinely missing-output handling. |
| Ordinary Sectioning | AI pages regenerated implicitly | Shared page selection fills missing only; explicit named/versioned reset/replacement, default off. API/queued revalidation; unaffected pages identical. |
| Locking | SPEC-0003 duplicates checks and extends existing CLI scope | Reuse base shared writer guard, narrow redundant checks; defer added existing-book resume. No unsafe in-process substitute for supported cross-process writers. |
| Reset versus preservation | Base retains fixed HTML/tree even after new Sectioning | Explicit reset consent commits deactivation before generation; authored Sectioning remains current on failure; history/assets recoverable. No ordinary reset. |

## Revised acceptance and narrative plan

The amended spec owns RAC-1–18. All are **not run** at this preparation checkpoint.
The nine latest-review scenarios map respectively to RAC-1; 2/8; 9; 10/11;
5/6/7/8; 3/4; 12/13; 5/6; 7/14/15/16. Each final row must identify actual
source head, tests/public observations, and any qualification independently of
human approval and release checks.

Preserve shared SPEC-0001/0002 authorship/lineage separation, exact-version Save,
protected translations/quizzes/TOC, stable IDs/answers/audio, TOC same-run consent,
NULL/current reads, retained draft/entry access and cosmetic-save freshness.
Their Sectioning AC-8/15 ordinary-AI regeneration and fixed-pair active retention
are deliberately refined only by this spec's explicit reset action; sibling PRs
are not edited. Single-page Revert still restores prior AI but no longer implies
ordinary regeneration eligibility here; its text must say explicit replacement.
Unknown/contradictory rendered ownership is retained raw/history/assets but omitted
with warning; missing authorship alone is not a reason to omit usable output.

Preserve untracked `spec-0003-stacked.md` and `tmp/` in place. Back up branch refs
before replay. Review #886/#888 for minimal reuse only; never merge descendants.
Refresh final heads, keep PR title/body byte-for-byte, push only after separate
reviewer recheck and full checks, then verify exact-head hosted CI and comment.
