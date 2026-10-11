# SPEC-0011 full continuation — before-edit acceptance map

Date: 2026-10-11. This map precedes restacking and runtime edits. Human approval
remains pending; no acceptance criterion is changed. PR #887 title/body are frozen
byte-for-byte for this continuation; only comments and base retargeting are authorized.

## Recovered work and dependency inventory

The clean existing worktree `tmp/spec-0011-implementation` is on local branch
`spec/spec-0011-prompt-persistence`, identical to published PR #887 at
`bb9e6420a7e475af67404d2efd8c827211c45583`. There are no unpublished SPEC-0011
commits, tracked drafts or stashes. The main checkout has untracked spec drafts;
other implementation worktrees have unrelated verification/tmp drafts. All remain
untouched. App task inventory shows this thread as the only active SPEC-0011 writer.
Prior recoverable refs and all attributed adaptations of #644 remain intact.

Refreshed published stack: #879 `a10d3fa0`, #880 `373619dd`, #884 `a5670d46`,
#886 `3a7ad4a33b18db8aac851c093712ce4d5112ec4d`. The graph contains them in that
order; develop is `ef31494d`. #887 shares old develop `737d3314` with that stack.
Integrating the genuine prerequisite branch into the existing implementation
preserves published commit identities and attribution without a history rewrite.
No descendant branch is merged into its ancestor. A backup will preserve #887's
pre-integration head. Its existing remote branch name is unchanged.

Read current spec, source issue, PR discussion/reviews and #644's attributed work.
The #644 review reiterates image prompt resolution, logical destination, required
revision and CLI root parity. SPEC-0003 review proposes semantic amendments still
not in its published spec; this task retains the published stack contract and
introduces no unratified mode/lock change. Current SPEC-0010 source contains shared
full resume and publication guards. Its prompt fingerprint reader still uses the
legacy resolver and two roots; SPEC-0011 must reconcile this, not bypass it.
Docker 29.8.0 is reachable with authorized host access. Old blocked percentages
and missing-dependency statements are historical, not current evidence.

## Every acceptance criterion

| AC | Existing behavior | Required change/audit | Concrete verification |
|---|---|---|---|
| 1 | Source/destination/dirty UI exists | Keep labels and reconcile freshness feedback | Actual Studio editor and browser Save/Reset/Restore |
| 2 | Filesystem/process durability exists | Preserve root injection across new stage executor | Read-only filesystem and packaged restart |
| 3 | Shared selected-version resolver exists | Reconcile dependency fingerprints and every new reader with the same roots | Variant/reset matrix and full API/CLI execution |
| 4 | Model-first precedence and source UI exist | Retain precedence while adding global roots to catalogs | Book generic vs bundled/global variant; unchanged consumer freshness |
| 5 | Required revisions and draft conflict handling exist | Retain through shared book writer admission | 428/409 and actual editor conflict tests |
| 6 | Cross-process prompt gates and ABA tokens exist | Audit lock ordering with shared book gate | Concurrent processes and Save/Reset/Restore race |
| 7 | Identical no-op and re-read on ambiguous response exist | Retain exact-content cache/freshness equivalence | Duplicate and ambiguous transport regressions |
| 8 | Immutable versions and atomic pointers exist | Verify shared publication rejects changed inputs | Fault injection, in-flight input mutation and retained output |
| 9 | Reset/restore retain history | Preserve during stack and archive integration | Bytes/selection histories across reset/restore/restart |
| 10 | Zod, containment and model ownership validation exist | Apply same validated resolver to fingerprint/include reads | Invalid names, pointers, symlinks and collisions |
| 11 | Newer typing and navigation guards exist | Reconcile new dependency UI and query invalidation | Deferred response, cross-book navigation, actual browser |
| 12 | Old API/stage/agent/CLI parity exists | Inject writable roots into new shared execution and catalogs | Production callers and actual CLI at stubbed transport |
| 13 | Caches captured rendered bytes; freshness fallback only | Integrate effective template/include/layout fingerprints with shared catalogs and guarded publication | Full resume changed/restored inputs, no-call Save, unchanged scopes and in-flight provenance |
| 14 | Idempotent source-retaining migration exists | Retain startup migration in API/CLI/Desktop | Legacy conflicts, interrupted publication and newer target |
| 15 | Historical macOS harness only; Docker now available | Refresh Desktop and Docker read-only/restart acceptance | Current packaged resources, persistent volumes and container recreation |
| 16 | Templates derive from bundled prompt parent | Keep derivation in new generation/resource fingerprints | API/CLI/Desktop/Docker template identity |
| 17 | Archives preserve prompt snapshots/history/logs; generic host warning | Use shared current-input catalogs after import to disclose effective host differences | Real ZIP/SQLite two-host read-model and provenance integration |
| 18 | Five locales complete on old head, no dependencies | Extract/translate any changed strings; strict compile | Lingui all five locales, lint, manifest diff |

## Whole-contract constraints and final gates

Keep model-specific-first precedence, immutable selected bytes, book-local
history/provenance, manual and unknown-output protection, stable identities and
referenced media. Save makes no provider call. Only effective consuming inputs
affect shared freshness; restored equal bytes can reuse valid caches. In-flight
operations must retain captured inputs and never gain evidence for newer prompts.
Reuse existing OutputMetadata, catalogs, book writer admission and staged
publication; no second freshness database/engine. Preserve compatibility flat
files, migration source retention/conflict refusal, operator recovery, explicit
rollback constraints and bundled-parent template lookup. No schema tuning,
provider-discovery change, automatic paid regeneration or global cache deletion.

Run focused regressions, full tests/build/typechecks/lint/invariants, extraction
and strict locale compilation, real book/browser and Desktop/Docker acceptance.
Delegate a separate adversarial reviewer only after implementation and initial
testing; fix material findings and obtain recheck before publication. Audit all
ACs again, publish only to #887, check exact-head hosted CI, and post current
coverage/dependency/review evidence tagging elasticsounds. No approval or merge.
