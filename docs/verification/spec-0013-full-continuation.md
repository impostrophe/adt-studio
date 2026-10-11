# SPEC-0013 full continuation

2026-10-12. This acceptance map was prepared before runtime integration; its first
file-write attempt hit the Xcode Python selection error. It is persisted here
after replaying the recovered commits, before implementing the remaining contract.
Human approval and all specification checkboxes remain unchanged. PR title/body
were captured and are frozen byte-for-byte.

Recovered d6233075 onto published SPEC-0012 d9dac253, with backup refs, Git bundle
and a hash manifest preserving the existing untracked evidence. Original PR712
attribution is retained. Historical missing-prerequisite claims are superseded.

| AC | Existing behavior | Required continuation | Concrete verification |
|---|---|---|---|
| 1 | Classified bounded HTTP retries | Retain in shared runner | Actual DNS/socket/408/429/5xx counts |
| 2 | Permanent failures fast-fail | Retain provider/auth interfaces | Auth/quota/model one-request checks |
| 3 | Validation feedback bounded | Audit CLI internal continuations | Invalid JSON/schema/semantic counts |
| 4 | Abort and backoff implemented | Compose shared execution | No calls/admission/dialog after abort |
| 5 | HTTP bounded; CLI agent continuations escape | Reliable pre-request enforcement retaining authentication | Installed Claude truncation and Codex tool probes |
| 6 | Validated cache, unknown usage | Reconcile force-fresh cache and actual calls | Real filesystem cache/usage tests |
| 7 | Interactive Retry disabled | Meaningfulness-only page loop | Three pages; successful siblings committed and not recalled |
| 8 | No interactive Retry | Each decision grants one bounded round | Repeated exhaustion/new IDs/no unattended loop |
| 9 | Skip diagnostics only | Preserved filtering and missing-input blockers | Manual prune/unknown data, page IDs/history/media |
| 10 | New stack stages whole generation | Page commits and guarded publication | Stale source/filter/config/prompt/protection, rollback/cancel |
| 11 | All Retry rejected400 | Enable eligible validated Retry | Ineligible/bulk400 without consumption |
| 12 | Owned once-only decisions | Input preflight before consumption | Wrong ownership/stale/two tabs/duplicate409 |
| 13 | SSE/poll/timers implemented | Retain authoritative reconnect state | SSE loss/reload/30s grace/10min timeout |
| 14 | Run decisions ephemeral | Retain committed recovery state | Process kill/restart; no automatic paid resume |
| 15 | CLI stops on exhaustion | Shared execution parity | Compiled CLI nonzero, no dialog |
| 16 | Durable skip logs only | Qualified durable summaries/readiness | Missing/retained filtering, downstream cardinality, archive |
| 17 | Sanitized diagnostics implemented | Exact request/outcome accounting | Credential/header/payload bounds, unknown cost |
| 18 | Accessible controls/locales, Retry hidden | Supported actions and qualified outcomes | React/browser, all5 locales extraction/strict compile |

Reuse shared writer admission, relevant-input/protection evidence, captured prompts
and guarded publication. No destructive cleanup, separate provenance system,
retry-all, paid automatic restart, new PR, changed auth semantics or weakened ACs.
Failed/Skip/Stop retains committed entities, history and media; Skip is never prune
or proof of currentness. Missing prerequisites remain explicit blockers.

Full checks and separate adversarial review follow implementation. Push only after
high-confidence review, then verify exact-head CI and summarize in a comment.
