# SPEC-0001 narrow legacy compatibility follow-up

Starting head: `d0afa178a1327cd988b486be2134299c861bae08`, base `develop`
`0b18602f8b42f4b52b4d2ccf2927635d5a4db572`, same PR #879.
The user's latest authorization adopts elasticsounds' Teams clarification.
Human specification approval remains pending. De-codable pg006 acceptance is
explicitly assigned to elasticsounds; it will not be claimed from synthetic tests.

## Requirements and verification map before editing

The preceding [gap-closure ledger](spec-0001-gap-closure-2026-10-13.md) records
the earlier seven fixes. Its historical-receipt/repair-screen approach is
superseded by this follow-up, not evidence for the new leaf-matching contract.

| AC | Current behavior and required change | Concrete verification |
|---|---|---|
| 1 | Cosmetic saves already preserve freshness; ownership recovery must not change content inputs | Cosmetic saves and no-provider tests, full suite |
| 2 | Protected French/Easy Read already preserved; recovered activity answers must keep their translations | Real-storage legacy answer/translation, existing protection suites |
| 3 | Catalog/image inventory already shared; recovered leaves must be discoverable | Catalog and image projections from legacy fixture |
| 4 | Stable IDs exist; add mutually unique leaf matching and resolve before structural changes | Reorder, clone/split/merge/delete, ambiguous/claimed/type/missing-leaf cases |
| 5 | Canonical signatures already implemented; ownership must not certify freshness or hash media | Freshness evidence before/after projection and edit; signature suites |
| 6 | Usable warned inputs already allowed; recovered legacy content remains protected | Output catalog/protection integration |
| 7 | Read-only historical recovery plus repair UI exists; replace with narrow fallback, defer repair UI | Real SQLite no-write reads, versioned edits, retained history/answers/translations |
| 8 | Current output/cache reuse already implemented; fallback must not scan historical media or call providers | Resolver without history/media access; recording-transport and full suites |
| 9 | Shared writer/version admission exists; use pre-edit ownership snapshot for every mutation path | Structural/assistant/rerender tests; ambiguity and changed-version rejection |
| 10 | Immutable physical publication already implemented; compatibility must retain referenced content | Existing failure/cancellation/filesystem suites |
| 11 | Asset restore already implemented; prior legacy versions remain restorable | History restore plus existing asset/packaging suites |
| 12 | Owned legacy content is usable; add qualifying leaf-only activities to Preview/export | Real Preview and packaged output with manual answer translations; unresolved disclosure |
| 13 | Requested-language Core TTS fallback already implemented | Existing preparation/fallback runner suites |
| 14 | Retry/cache distinction already implemented | Existing actual transport-call count suites |
| 15 | Inline output review already implemented; remove out-of-scope ownership repair controls | Studio review tests, extraction and five-locale compilation |
| 16 | Skip/prune/restore already implemented; ownership must not reactivate excluded sections | Pruned legacy projection/restore tests and existing runner suites |

## Accepted compatibility assumption

When both ownership declarations are absent, match only same-page, same-type,
unclaimed source sections with at least one content leaf and every leaf's exact
data ID present in the HTML. Ignore synthetic containers. Require uniqueness
in both directions, considering all qualifying pairs before assigning anything.
Contradictory explicit ownership is never repaired by this fallback. Unresolved
content/history is retained with disclosure. Fixed-layout compatibility stays.

This is a compatibility assumption, not historical proof: moving an entire
content tree can yield a misleading match. The reviewer explicitly accepted this
limitation for the smaller fix. Historical reconstruction, migration tracking
and an ownership repair screen are deferred. Resolving an owner neither certifies
freshness nor launches generation. Successful edits persist ownership in a new
entity version; reading a book never persists the projection.

## Results

Pending implementation and verification. No acceptance completion claimed here.
