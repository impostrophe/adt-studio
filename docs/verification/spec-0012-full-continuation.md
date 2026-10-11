# SPEC-0012 full continuation

2026-10-11. This acceptance map precedes runtime edits. Specification approval
remains pending. The published specification, including its narrative and safe
fallbacks, is the target; its acceptance criteria are unchanged. PR #888 title and
body were captured byte-for-byte and are frozen for this continuation.

## Recovery and integration baseline

Recovered all eleven local commits through `caad1343`, including the stable-ID
classifier, read projection, Studio notices, independent-review fixes and the
transport-tested force-fresh implementation. Preserved
`backup/spec-0012-before-full-continuation-20261011` and
`backup/spec-0012-published-20261011` before replaying onto published SPEC-0011
`a1259013aa2a19bcc6f19e9a28fbc3a42e760e04`. Published #888 remains `b850875c`.
The remote branch name is unchanged. Other worktrees and untracked spec drafts
in the main checkout are untouched; no stash or target-worktree draft was found.

Refreshed stack: #879 `a10d3fa0`, #880 `373619dd`, #884 `a5670d46`, #886
`3a7ad4a3`, #887 `a1259013`; develop `8e79fb8b`. The actual graph contains the
five implementation prerequisites in that order. SPEC-0013 is not a dependency.
PR #581 (`8d077980`, Kemal Sokolovic) remains the attributed starting point for
pure propagation/optional text handling; it is not modified. Historical 35–40%
completion and missing-dependency reports are superseded by this integration
audit, not by an assumption that the published dependencies work together.

## Before-edit acceptance map

| AC | Current behavior | Required integration | Concrete verification |
|---|---|---|---|
| 1 | Pure patcher; saves do not call it | Server-owned shared Save | Real SQLite save with provider transport count zero |
| 2 | Patcher preserves bytes; old reconciliation normalizes HTML | Non-normalizing catalog reconciliation | Exact unrelated rows/HTML and media hashes |
| 3 | Escaping/blank/container fixtures exist | Retain through persisted saves | Activity page, injected markup, empty/optional leaves |
| 4 | Stable-ID classifier exists | Stable-ID save/repair adapters | Sparse/reordered arrays and duplicate page ownership |
| 5 | Pure structural/invalid fallback exists | Persist semantic edit while retaining output | Missing/malformed/structural source/API fixtures |
| 6 | GET protects all unknown outputs | Shared per-section generation evidence; manual protection | Generated history, forged metadata, manual divergence |
| 7 | Existing endpoint transaction lacks trusted correspondence | Extract shared atomic Save; validate both versions | Inject rendering/metadata failure; compare SQLite history |
| 8 | Semantic saves succeed but generic response | Authoritative per-section committed response | Unpatchable saves and subsequent reads |
| 9 | Saves append duplicates | Content equality and one combined rendering write | Already-patched pairs and repeated submissions |
| 10 | Source-only version guard and writer lease | Rendering guard and safe Studio draft lifecycle | Stale source/render, active task, late/ambiguous responses |
| 11 | Read-only unknown drift exists | Reconstruct from retained shared provenance | Reopen/restart, archive/import, restore; no added versions |
| 12 | Existing rerender task; notices always unknown | Guarded repair and authoritative completion | Success/failure/cancel/stale publication; notice persists |
| 13 | Rerender uses index and force-fresh | Stable targets, shared protection/mode/prompt capture | Real transport/cache counts; unrelated sections preserved |
| 14 | Fixed-layout notices exist | Retain semantic Save and supported navigation | Genuine positioned page; no semantic repair action |
| 15 | Old Save/rerender clear downstream nodes | Shared signature/catalog reconciliation, no deletion | Scoped freshness, manual history and referenced assets |
| 16 | Classifier never falls back to index | Repair expected versions and active ownership | Retired/restored IDs, recycled index, historical rows |
| 17 | Notices translated on old head | Committed editor/preview refresh, actionable notices | Studio deferred responses, navigation and five locales |
| 18 | Old evidence explicitly partial | Accurate final implementation/release evidence | Full AC audit, independent review, exact-head CI |

## Narrative and compatibility gates

Reuse OutputMetadata/input evidence, shared book writer admission, existing task
service, mode preflight, captured prompt engine and guarded publication. No paid
generation on Save, no array-position correspondence, no inferred AI origin from
matching text, no separate freshness database, no book-wide content clearing.
Unknown/invalid/manual/custom cases retain output and expose a review path.
Fixed-layout semantic-to-positioned synchronization remains explicitly out of
scope; product acceptance of that boundary and issue closure are separate.

Legacy callers must supply expected source and rendering versions; failures keep
their draft. Restored content remains versioned and old IDs never become a route
to successor sections. Saved source/render/provenance must commit atomically.
Failed/cancelled/stale repair retains output, media, history and valid caches.
No pipeline ordering, mode-policy or prompt-precedence changes are authorized by
this integration. Pending review proposals on dependencies are not silently
applied as amendments to their published contracts.

Required final gates: focused and full tests, typecheck/runtime typecheck, lint,
build, invariants, Lingui extraction/strict compilation; actual reflowable
activity and positioned page acceptance; archive/import and available Desktop/
Docker checks. A separate fresh adversarial reviewer must review the final diff,
with material fixes rechecked before pushing. Update this document with actual
results and limits; do not infer release approval from development checks.
