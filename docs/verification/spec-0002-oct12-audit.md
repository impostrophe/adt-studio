# SPEC-0002 integration and acceptance audit — 2026-10-12

Status: implementation review in progress. No publication, specification approval
or release certification is claimed by this checkpoint.

- Starting published #880: `f21413a6cb5225aab5f2be1fea48390fe8c48fde`.
- Refreshed #879 prerequisite: `aefe41855ae63d89c09db5553c50f48eb01b190d`
  (runtime checkpoint `9d8bde0d`; hosted test/Docker/i18n run `38226029890`).
- Actual old prerequisite boundary: `a10d3fa0`; replayed only 28 SPEC-0002
  commits onto the new prerequisite, producing integrated baseline `9cecf188`.
- Recoverable refs: `backup/spec0002-local-before-oct12`,
  `backup/spec0002-published-before-oct12`, `backup/spec0002-old-prerequisite-oct12`.
- #884 `a5670d46`, #886 `3a7ad4a3` and #888 `d9dac253` inspected; none merged or
  modified. The pair-retention rule is adapted from #884; direct preview uses
  #888's shared reading-order lookup plus #879's stable-owner metadata.
- User-authored quiz grouping, single-page Revert, confirmation copy and compact
  TOC badge are preserved. Title/body of PR #880 remain untouched.

## Pre-edit requirement map

The map below was recorded before rebasing or editing production code. It is a
plan for acceptance, not a claim that its checks have passed.

# SPEC-0002 renewed acceptance audit — 2026-10-12

Prepared before integration/application edits. Target `f21413a6`, old prerequisite
`a10d3fa0`, new prerequisite `aefe4185` (runtime `9d8bde0d`), develop `410d4b2f`.
The source spec, owner amendments and review `5486314026` are the contract.
Historical passes are not fresh acceptance. A separate reviewer builds its own map.

## Feedback-to-fix plan

| Finding | Current behavior/evidence | Required correction and public-entry acceptance |
|---|---|---|
| F1 P1 | Published review reproduces old HTML/answers attached to newly minted Sectioning IDs; updated #879 resolves shared stable owners but direct Preview needs inspection | Inherit shared resolver; adapt smallest #884/#888 Preview/publication correction. Real Sectioning HTTP replace/reorder/retire, catalog answer identity, translation/audio, current/history, prune/restore, preview/package. Conflicting/unknown owners retained raw and omitted with warning; no positional inference |
| F2 P1 | Generic id-keyed TOC draft merge treats positional toc_001 as identity across chapter changes | TOC-specific conflict policy, preserve whole draft on changed targets/replacement. Mounted editor reject Save → recover → next Save with reorder, insert/remove, target replacement and independent concurrent edits; retain owner-reviewed conflict controls |
| F3 P1 | Preparation clears positioned trees while protecting HTML/page records | Adapt paired rendering/tree preservation from #884 without importing descendant subsystem. HTTP ordinary Sectioning skip, mixed success/failure/cancel, restart and fixed-layout preview/export; pair unchanged until successful replacement |
| F4 P2 | Section retirement versions the TOC; later same-run consent no longer matches, worker silently skips | Authorize only exact same-run transformation lineage or explicitly fail with renewed-confirmation requirement. Actual stage-range calls, model counts, current/history; external version/contents changes must not acquire consent |

## Pre-edit AC map

| AC | Current observable/source behavior; required audit/correction | Public entry points and concrete verification |
|---|---|---|
| 1 | Per-entry guarded server stamping exists; integrate new legacy/source guards without weakening | Translation PUT → catalog service/storage; changed/new/unchanged/forged/no-op, stale aliases/source removal; zero model calls on Save |
| 2 | Fixed 50-entry windows and current-output skipping exist; preserve delegated reconciliation | Translate route/run/worker plus real stub transport/cache; 8,850 entries, no-op, missing/changed, protected-only, retry accounting, unchanged neighbor versions |
| 3 | Quiz save preserves IDs/options and stamps content changes | Quiz PUT → saveQuizOutput; guards, exact stamping, duplicates/invalid legacy, history |
| 4 | Owner amendment skips complete protected page groups, not individual pages | Quiz full/empty/repeated runs and generate-one; actual generation counts; group order/overlap/settings changes, no regrouping, IDs/option answers/audio/reading order preserved |
| 5 | Whole TOC guarded save and AI publication exist | TOC PUT/generation; forged tags, history, no provider calls on Save |
| 6 | Single-stage confirmation passed owner walkthrough; F4 affects combined path | Named TOC run plus Sectioning→TOC; frozen consent, zero calls on cancel/refusal, fresh AI on successful replacement |
| 7 | Structural routes stamp page record; updated ownership must not regress | PUT/clone/split/merge/cross-page/delete/AI-edit → saveStoryboardNode; actual stored versions and ID factory/retirement |
| 8 | Protected source pages skip model; F3 clears paired positioned output | Sectioning run preparation + worker; protected current/history/HTML/tree byte equality and zero calls; eligible neighbor generated |
| 9 | Existing six-type save/run test has aligned fixtures; F1/F3 need adversarial identity layouts | Real Save → HTTP own/upstream runs → read/history → preview/export, including captions/glossary prerequisite behavior |
| 10 | Four badges and owner-reviewed compact TOC pill exist | Preserve UI changes; extract/strict compile five catalogs, lint and browser new failure flows |
| 11 | Unknown provenance protected; old-read probe exists | Ordinary legacy runs and built old API isolated read/preview/export/current reopen. Carry #879 unknown-owner omission qualification explicitly |
| 12 | Restore tags and owner-added single-page Revert exist | Restore HTTP guards, stale/busy/missing AI, neighbor unchanged, history retained; F1 restored stable owner, F3 restored paired content |
| 13 | Empty/manual source and destination records handled | Real delete-last/cross-page merge→run; both protected, moved content once, source/render mismatch safe |
| 14 | Active membership retirement leaves history; F1 association and F4 TOC guard remain | Source removal/section retirement→catalog/read/history/restore; physical assets and inactive identities retained without reassignment |
| 15 | Frozen named page/version consent, default off; owner wording retained | Existing dialog plus real range API; no authorization widening on background refetch or external writes |
| 16 | Per-unit transactions defer retirement; F3 pairing requires audit | Failure/cancel/injected publication rollback, duplicate requests, restart; fresh quiz IDs only at success, section/reference retirement atomic |
| 17 | Existing preview/export tests aligned; F1/F3 violate consumers | Real web package/reader destinations/quiz scoring, old-vs-new section URLs, stable answers and assets; unknown-owner omission remains qualified |
| 18 | Guarded drafts preserve newer independent edits; F2 unsafe TOC identity | All four saves, active worker/queued/external writer, restore; actual TOC editor recovery/next Save, Save & leave/navigation and refetch |
| 19 | CLI persistence AI stamps exist; no full resume guarantee | Registered DAG persistence tests; verify no authorship/lineage schema conflict with updated base; preserve safe refusal scope |

## Narrative, prerequisites and publication gates

- Reuse writer admission, freshness, stable owner resolution and transactions.
  Preserve #879 regressions for Easy Read, glossary IDs, audio bytes/timings,
  deleted-book admission, legacy duplicate reads, paired locations and NULLs.
- #884 `a5670d46`, #886 `3a7ad4a3`, #888 `d9dac253` are reference implementations;
  inspect and attribute focused adaptations only. Never merge a descendant here.
- Keep authored content, stable identities, raw history and physical assets;
  read/navigation does not mutate them. Authorship is separate from lineage/review.
- Preserve owner-reviewed quiz batching and single-page Revert semantics. Full
  Storyboard preservation, old-build edits and full CLI resume remain non-goals.
- #879's unknown/contradictory rendered-owner fallback retains raw/history/assets
  but omits unsafe preview/export associations with warnings. This qualifies
  SPEC-0002 preview/export compatibility too; do not mark it passed by wording.
- Independent adversarial review and recheck of fixes required before push.
  Run focused then full tests/types/lint/build, Lingui, real book/new browser
  failures, old-build probe, combined Docker export/restart, unpacked Desktop
  bundled API/resources. No paid providers or user-book mutation. Record limits.
- Preserve PR title/body and spec approval metadata. Exact-head CI and a concise
  review comment follow publication to the same branch; no merge or issue close.
