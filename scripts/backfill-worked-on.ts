// Fills "Worked on" on the Kanban Project from PRs updated since a date (the
// Worker only looks back three days each hour). Project only.
//   GITHUB_TOKEN=$(gh auth token) node scripts/backfill-worked-on.ts [since=2026-01-01] [--dry-run]
// The token needs the `project` scope and read access to the repos.
import { syncPrAuthors } from '../src/worked-sync.ts'
const PROJECT = 'PVT_kwDOAAKu6c4BlQRn' // unicef #46
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const since = args.find((a) => !a.startsWith('--')) ?? '2026-01-01'
const changed = await syncPrAuthors(process.env.GITHUB_TOKEN!, PROJECT, since, { dryRun })
console.log(`${changed} card(s) ${dryRun ? 'would be' : ''} updated (PRs since ${since}).`)
