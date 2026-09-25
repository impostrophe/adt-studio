# SPEC-0013 implementation review — 2026-09-25

The review started at local `75de501c` on `spec/685-page-failure-recovery`,
against develop `737d331418d13f930955504e8288ee26ec1b20ba`. It independently
re-evaluates the implementation against the published specification, issue #685,
PR #712 and the existing application paths. This is an agent review and does
not constitute the pending human approval. No commits were pushed.

**Verdict: useful partial implementation, not complete page recovery.** Estimated
completion is approximately **60% of the original behavioral contract**. This is
a judgment weighted toward user behavior, not a test-count or lines-of-code
metric. Eleven criteria have evidence within the scopes in the
[acceptance matrix](SPEC-0013-implementation-evidence.md); seven remain blocked
in full. The missing criteria include the central protected page Retry behavior.
Confidence in the implemented HTTP retry, decision and diagnostic slice is
**moderately high (8/10)** after remediation. Confidence is insufficient to
approve the full specification or promise safe recovery on edited books.

## Findings fixed during this review

| Severity | Finding and impact | Correction and regression evidence |
|---|---|---|
| P1 | With two concurrent page failures, choosing Stop resolved one broker promise, but the sibling waited for a separate decision or timeout. The stopped step could remain running for up to ten minutes. | Pass the step abort signal into the existing broker; finish sibling decisions and detach listeners when the step stops. A real-storage, real-runner, real-broker three-page regression demonstrates prompt termination and no third page invocation. |
| P1 | Admission used a boolean. Resolving one failure with Skip opened it even while another failure still awaited a decision; later pages could incur provider calls while the UI was paused. The launch ramp also lacked a post-delay admission recheck. | Count pending pauses, release only after all resolve, and recheck after the ramp. The same runner regression proves the third page stays unstarted after the first Skip. Both runner cases failed before the fix and passed afterward. |
| P2 | SDKs with no usage returned NaN, while CLI adapters manufactured zero usage. Studio could consequently display zero cost for a request with unknown cost. | Normalize missing, partial, negative and non-finite usage to unknown; preserve measured zero and known usage on invalid CLI responses. The API counts unknown-usage calls and Studio explains incomplete token totals instead of estimating their cost. HTTP, CLI, SQLite API and rendered Studio tests cover the behavior. |
| P2 | Invalid model output disappeared from attempt inspection; credentials resolved from server configuration were absent from the redaction set, so semantic feedback could expose them in logs or subsequent feedback requests. | Retain failed output, resolve the active provider's declared secret fields, and redact diagnostic text and validation feedback. Three actual-SDK transport regressions failed before remediation and passed afterward, covering missing usage, failed-response inspection and redacted subsequent request bodies. |
| P2 | CLI invalid JSON/schema failures were generic unknown errors, losing their validation feedback and reported usage. Wrapped native timeout/abort exceptions were also missed because their names are inherited native accessors. | Emit typed validation errors with output/usage from both CLI adapters; inspect native DOMException names safely through nested causes. Keep CLI quota advisory failures permanent. Adapter/classifier regressions pass; this does not prove executable-internal HTTP budgets. |
| P2 | A no-call cancellation control row looked like an error in Debug, even though it represented cancellation rather than another failed paid request. | Display the existing translated Cancelled status and exclude cancellation from the error aggregate; regression coverage checks both UI status and API totals. |

No separate recovery subsystem, provider dependency or durable decision store was
introduced. API additions remain backward compatible. The prompt/output
inspector still retains book content while removing known credential values.

## System-level review and remaining blockers

The path was traced from Studio's keyed decision dialog and authoritative
polling through strict Hono validation, the run-owned broker, page admission,
Meaningfulness publication, persisted logs and Debug statistics. The CLI/DAG
headless path and storage startup interruption behavior were also reviewed.

1. **Shared freshness and readiness — SPEC-0001 / [PR #879](https://github.com/unicef/adt-studio/pull/879).**
   Inspected head `375081fc3ba84b185861c7977623ae2d589eb34a` is documentation only.
   Recovery needs input/config/filter/output version checks and an honest
   retained-result readiness policy before dependent stages consume old data.
2. **Manual-work and history preservation — SPEC-0002 / [PR #880](https://github.com/unicef/adt-studio/pull/880).**
   Inspected head `5eeaab68665f594f828dcf448b30e52dc109ba7a` is documentation only.
   `makeBeforeRun` in `apps/api/src/routes/stages.ts` still clears node types and
   histories before execution. Meaningfulness still publishes filtering through
   `putNodeData` without checking the captured input/output versions. A failure
   after cleanup cannot preserve already-deleted history; a late response can
   supersede a newer edit. Broker tests do not prove these writes safe.
3. **Non-destructive downstream admission — SPEC-0010 / [PR #886](https://github.com/unicef/adt-studio/pull/886).**
   Remote head `d906d7f3aa39b8dc6b57b36c1971221cf16e4966` is documentation only.
   Local implementation refreshed through `d8be3223` contains shared writer admission
   and safe extraction, but explicitly refuses unsafe downstream resume. Its
   latest import/font admission fixes do not provide Meaningfulness's
   preservation/freshness
   prerequisites. It was inspected, not imported or modified.
4. **Remaining SPEC-0013 work / [issue #685](https://github.com/unicef/adt-studio/issues/685).**
   Once the shared contracts exist, this PR still needs the page-only manual
   Retry loop, captured-version conflict validation, protected publication,
   explicit page-specific skipped-with-error persistence, downstream cardinality
   and qualified completion UI. These are unfinished implementation tasks here,
   not changes that another spec will automatically deliver. Current Skip can
   still emit ordinary step completion with a count; it does not satisfy AC-16.
5. **External CLI request-budget boundary — AC-5/6.**
   Codex and Claude executables can make hidden requests beyond one adapter
   invocation. Their invalid-output usage is now preserved and absent usage is
   honestly unknown, but the actual wire-request budget remains uncontrolled
   and unverified. A controllable transport boundary is required, or a separately
   approved, explicit spec amendment. The current acceptance criteria stand.

Interactive Retry therefore remains unavailable everywhere, including
Meaningfulness. This follows the dependency gate; it must not be described as
completion of AC-7/8. Existing rerun/Skip paths are not certified safe merely
because the new broker cannot issue Retry. Shared prerequisite coverage must
include both API and CLI, not only a Studio guard.

## Verification and limits

- Focused suite: 12 files / 257 tests passed, including the reproduced failures.
- `pnpm test --maxWorkers=2 --testTimeout=30000`: **283 files / 3,684 tests
  passed** in 627.60 seconds with other worktrees running tests concurrently.
  Its pretest `pnpm build` passed. Eleven regression cases and one test file were
  added over the previously verified 3,673-test revision.
- `pnpm typecheck` passed. `pnpm lint`: zero errors, the same eight
  unused-suppression warnings reproduced
  on the untouched develop baseline during implementation.
- Studio production build, API server and Electron API bundles passed.
- Lingui extraction and strict compile passed: 3,623 messages, no missing
  translations in any of the five supported locales.
- Rebuilt production Studio browser acceptance passed reload/poll recovery,
  rejected submission, refresh/Stop and two-tab resolution. No unsupported Retry
  appeared, no JavaScript errors occurred, and the disposable book DB remained
  byte-for-byte unchanged. The fixture injects decisions through the real broker;
  it does not simulate an implemented manual Retry worker.
- Fresh-book compiled CLI acceptance passed again: exit 1 in 8.7 seconds after
  exactly six intercepted transport requests (three metadata, three
  Meaningfulness), with no dialog or live paid calls.
- Runtime: Node 22.23.2, matching the current CI major version. Test logs and
  disposable browser harnesses are retained locally under `tmp/acceptance/`.

Current checks do not establish protected three-page retry, manual prune/history
preservation across a rerun, concurrent input/output replacement, or a crash
inside an incomplete publication transaction. The real process restart test
covers only the committed failure-decision boundary. The earlier Docker smoke
was on an earlier local implementation revision; this review does not claim it
as current-head Docker verification. Signed installers, packaged Desktop launch,
Windows, paid providers, release/upgrade and hosted CI remain unverified.

Remote PR #889 still points to the original documentation head
`2a5da50a9de1d58c2131ad1132f8bda22d9ba9e5` on the original document stack.
Retarget to develop together with a later authorized push, using the preserved
backup ref and a fresh remote lease check. PR #712 remains unchanged and its
applicable starting work remains attributed in the implementation evidence.
Specification approval, retained-result product review and any CLI-budget
amendment remain human decisions; no approval or acceptance checkboxes were
fabricated by this review.

Local remediation commits: `382261fb` (concurrent decisions), `ac311a75`
(provider diagnostics/usage), and `310f1fca` (API/Studio accounting and locales).
The final documentation commit records these tested changes without publishing
them.
