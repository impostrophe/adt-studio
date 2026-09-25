# SPEC-0013 implementation evidence

Implementation before human approval was explicitly authorized on 2026-09-25. The spec remains in-review, with no approvers. No release verification is claimed.

## Baseline and dependency decisions (before implementation)

- develop: `737d331418d13f930955504e8288ee26ec1b20ba`.
- Published #889: `2a5da50a9de1d58c2131ad1132f8bda22d9ba9e5`; documentation parent #888 is not an implementation prerequisite. Local branch rebased directly onto develop; backup `backup/spec-0013-before-implementation-20260925` preserves the original stack. Remote base must change only alongside later authorized publication.
- #712: `92ce4d19213b3406b09775a9c0c9227022a8e34c`, Kemal Sokolovic. Its classifier, diagnostic vocabulary and decision validation are the adaptation starting point. Its malformed-output review regression must stay fixed. The old monolithic client and runner are not copied over current provider ports.
- #879/SPEC-0001 and #880/SPEC-0002 contain documentation only; no shared filtering/output provenance, replacement authorization or freshness planner is implemented. #886 remote is documentation only; its local safe-extraction implementation has shared writer admission but explicitly refuses downstream resume. None provides the complete recovery prerequisite.
- Current stage reruns clear prior state before the runner; existing Meaningfulness writes filtering results without source/config/output version checks. Enabling the old #712 retry loop would violate AC-10. Use the published spec's fallback: unsupported replacement retains data and stops. This delivery must not claim interactive retry or safe whole-book reruns until those dependencies exist.
- Current AI SDK native-schema/json-mode/tool-call paths disable SDK retries. Parse-repair has a hidden two-call loop and multiplies the outer budget. CLI-backed providers run external executables whose internal request counts are not controlled by the facade; their wire budget cannot be claimed verified.

## Acceptance plan

Every criterion is mapped before code changes. Final results will replace planned status only with executed evidence.

| AC | Current behavior / required change | Concrete verification planned |
|---|---|---|
| 1 | Outer bounded loop exists; typed transient classifier absent | Wire counts for DNS/reset/408/429/503; fake timer delay tests |
| 2 | Only local provider configuration errors fast-fail | Structured/nested quota 429, auth, permissions, model tests; one wire request |
| 3 | Unknown and semantic failures retry; malformed parse-repair has hidden loop | Unknown, invalid JSON/schema and feedback tests |
| 4 | Backoff abort exists; per-call signal masks model signal and admission ignores abort | Cancel before call, during rate wait/request/backoff; zero further transport calls |
| 5 | SDK retries disabled except parse-repair hidden round; CLI internals opaque | Real SDK over stub fetch; three calls for maxRetries=2 in each HTTP strategy; CLI limit explicitly unverified |
| 6 | Cache written before validation; schema not checked on disk hits | Real cache directory, corrupted/legacy cache, no failed entry, no unrelated eviction, usage/count evidence |
| 7 | No manual page retry on develop; dependency unavailable | Blocked until shared safe admission/protection integration; do not enable Retry |
| 8 | No Retry action today | Schema/broker reject retry-all without consumption; bounded rounds foundation tested; production page retry blocked |
| 9 | Existing skip keeps in-memory filtering, but upstream cleanup unsafe | Full persistence contract blocked by shared admission/protection; do not claim safe rerun |
| 10 | No output provenance or concurrency recheck; pre-run deletion | Blocked; retain existing unsupported-stage behavior and do not introduce unsafe replacement |
| 11 | Retry rejected by schema; no eligible retry server support | Strict schema + broker/API 400 without consuming; unsupported stages remain ineligible |
| 12 | Broker resolves globally by decision ID, missing book ownership | Bind book/run/step/page, duplicate and cancel API tests |
| 13 | Polling exists; grace only checked before first listener | SSE/poll equivalence, disconnect/reconnect, 30-second grace and ten-minute timeout |
| 14 | Policies keyed by label; restart loses decisions | Run-scoped lifetime, cancellation/new run, fresh broker rejects old IDs; existing persisted interrupted-state behavior audit |
| 15 | Headless default is stop | Existing runner/DAG/CLI failure regressions and shared transport exhaustion |
| 16 | Skip summary only has count; no shared freshness/protection | Durable page IDs can be retained in existing summaries; complete readiness/cardinality contract blocked |
| 17 | Logs have attempts/cache/usage but raw error descriptions and no classification | Additive shared diagnostic fields, bounded safe errors, log persistence and UI tests |
| 18 | Skip/Stop dialog optimistically disappears on submission | Await response, disable duplicates, retain/refetch on failure; all five locales; no Retry advertised without safety prerequisite |

## Contract boundaries

Preserve configured counts, exponential jitter/backoff and timeouts, valid cache identities, source page IDs and content. No new provider, queue, dependency, durable decision database or automatic paid-work restart. Additive diagnostics keep old logs readable. Unknown provider cost remains unknown. Broader editing safety is a prerequisite, not functionality to recreate here.
