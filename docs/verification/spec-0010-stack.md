# SPEC-0010 published-stack continuation

Before-edit map, 2026-10-11. This is a plan, not passing acceptance or approval.
Target #886: `876cc2ae`; prerequisite #884: `a5670d46`, including #880
`373619dd` and #879 `a10d3fa0`; develop: `ef31494d`.

The existing target contains no tracked drafts. Untracked evidence is retained.
The main and sibling checkouts are not modified. Preserve the PR title/body
byte-for-byte. Existing strict SPEC-0003 contract remains the implementation
target under the user's explicit instruction; its unratified warning/skip and
in-process-lock proposal is not adopted. No dependency review/merge gate applies.

## Acceptance map

| AC | Published behavior | Current implementation / required change | Concrete verification |
|---|---|---|---|
| 1 | A new/eligible initial-import destination extracts successfully and records a complete manifest only after all required data is durable. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 2 | Same-byte PDF and equivalent effective extraction inputs reuse extraction with no PDF/page/image/history rewrite. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 3 | Changed PDF bytes reject before overwriting the stored PDF, even when filename/size are unchanged. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 4 | Every extraction-affecting option and contract version participates in compatibility; downstream-only settings do not force extraction. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 5 | Missing/corrupt extraction-owned assets, zero-page output and incomplete manifests cannot be reused. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 6 | Legacy books without trustworthy manifests are rejected without guessed provenance or content deletion. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 7 | Interrupted/failed extraction retains its diagnostics/partial data and cannot become complete on restart by assumption. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 8 | Reuse retains all entity histories, version allocation, manual Core TTS, uploaded audio/video and stable-ID mappings. | Preserve original histories/assets across supported downstream execution, not just admission. | Real SQLite versions, media hashes and identity allocation before/after positive resume, cancellation and conflict. |
| 9 | No rejected admission calls `clearExtractedData`, retires identities, copies the input PDF, writes content or starts a provider request. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 10 | API, CLI, queued and direct extraction entry points enforce the same admission policy before pre-run mutation. | Deduplicate published extraction admission; share execution-time planning across API, queue and CLI. | Actual HTTP, queued, direct extraction and CLI subprocesses on identical fixtures. |
| 11 | Two processes/runners cannot both acquire an empty/existing book for conflicting mutation; crash recovery does not evict a live writer. | Retain one cross-process writer protocol from SPEC-0003; preserve uncertain mutex recovery. | Competing processes, live/dead/orphan ownership, SIGKILL and no timeout deletion. |
| 12 | Downstream resume uses shared freshness/protection semantics and stops before mutation when those capabilities are unavailable. | Integrate and extend shared freshness/protection execution; retain refusal only for genuinely uncovered work. | Current/stale/protected scopes, positive resume, mode preflight and before-publication conflicts. |
| 13 | Proven-current complete output causes no provider calls; stale/unknown/protected work is reported honestly and required unresolved work exits nonzero. | Provide shared truthful per-scope results and nonzero unresolved exits. | Zero actual provider requests for proven-current work; selective stale calls; partial/cancel/duplicate results. |
| 14 | Normal valid LLM caches survive admission and are still validated/reused by generation. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 15 | Changed-source guidance requires a fresh user-selected destination and never transfers old IDs/edits by position. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 16 | CLI/API errors identify the mismatch/busy/legacy reason without book text or secrets; Studio messages are translated in all five locales. | Carry structured admission and execution outcomes through API/CLI and Studio. | Result schema, HTTP/SSE/CLI assertions and five-locale extraction/compilation. |
| 17 | Source mutation during initial import cannot produce a completed manifest that describes different extracted bytes. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |
| 18 | Book archives retain source, manifest, histories and referenced media; no book-specific provenance lives in a global directory. | Already implemented in the extraction safety slice; preserve and verify on the published dependency stack. | Rerun the corresponding extraction-admission, writer, archive and API/CLI regression; compare persisted bytes/versions and transport calls. |

## Narrative and rollout obligations

No implicit re-extraction, legacy provenance backfill, positional ID transfer,
global cache clear, separate scheduler or separate provenance store. Use shared
catalog signatures/protection, PIPELINE graph, Sectioning preflight and atomic
publication. Unknown freshness is never current. Preserve initial import
metadata/fonts, source snapshots, part windows, active histories/media, queued
revalidation, cancellation and anonymous-mutex evidence. Unsupported capability
refuses before paid work/content writes and must remain explicitly partial.

Reconcile the attributed SPEC-0010 adaptation in #884 with #886's archive stream
lease, archive ownership filtering/collision remapping, structured admission-only
summary and invariant checker. Full tests, typechecks, lint, build, translations,
packaging and positive runtime acceptance follow focused regressions. Record
actual failures and release limits rather than inheriting historical results.
