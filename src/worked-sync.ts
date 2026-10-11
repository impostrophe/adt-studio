// Adds the authors of the pull requests linked to each open card to its
// "Worked on" field. Opening or linking a PR moves no card, so the bot hears
// nothing: the Worker runs this once an hour for PRs updated in the last few
// days, and scripts/backfill-worked-on.ts runs it once over a longer period.
// Works on the Project only; issues and PRs are not touched.
import { graphql } from './github.ts'
import { linkedIssues } from './rules/linking.ts'
import { mergeWorkedOn } from './rules/worked.ts'

export const WORKED_FIELD = 'Worked on'

type Card = { itemId: string; number: number; worked: string | null }

export async function syncPrAuthors(token: string, projectId: string, since: string, opts: { dryRun?: boolean; log?: (s: string) => void } = {}) {
  const log = opts.log ?? console.log
  // The open issue cards on the Project, by repo.
  const repos = new Map<string, Map<number, Card>>()
  let fieldId: string | null = null
  let after: string | null = null
  do {
    const d: any = await graphql(
      token,
      `query($p: ID!, $after: String) { node(id: $p) { ... on ProjectV2 {
        field(name: "${WORKED_FIELD}") { ... on ProjectV2Field { id } }
        items(first: 100, after: $after) { pageInfo { hasNextPage endCursor } nodes { id
          worked: fieldValueByName(name: "${WORKED_FIELD}") { ... on ProjectV2ItemFieldTextValue { text } }
          content { ... on Issue { number state repository { nameWithOwner } } } } } } } }`,
      { p: projectId, after },
    )
    const project = d?.node
    if (!project?.field?.id) return 0 // no "Worked on" field: nothing to do
    fieldId = project.field.id
    for (const it of project.items.nodes) {
      const c = it.content
      if (c?.state !== 'OPEN') continue
      const cards = repos.get(c.repository.nameWithOwner) ?? new Map<number, Card>()
      cards.set(c.number, { itemId: it.id, number: c.number, worked: it.worked?.text ?? null })
      repos.set(c.repository.nameWithOwner, cards)
    }
    after = project.items.pageInfo.hasNextPage ? project.items.pageInfo.endCursor : null
  } while (after)

  // Their PRs, newest first, until older than `since`.
  const authors = new Map<string, Map<number, string[]>>()
  for (const [repo, cards] of repos) {
    const [owner, name] = repo.split('/')
    const known = new Set(cards.keys())
    const byIssue = new Map<number, string[]>()
    let after: string | null = null
    do {
      const d: any = await graphql(
        token,
        `query($o: String!, $n: String!, $after: String) { repository(owner: $o, name: $n) {
          pullRequests(first: 50, after: $after, states: [OPEN, MERGED], orderBy: { field: UPDATED_AT, direction: DESC }) {
            pageInfo { hasNextPage endCursor } nodes { title body headRefName updatedAt author { __typename login }
              closingIssuesReferences(first: 10) { nodes { number } } } } } }`,
        { o: owner, n: name, after },
      )
      const prs = d.repository.pullRequests
      for (const pr of prs.nodes) {
        if (pr.updatedAt < since) continue
        if (!pr.author || pr.author.__typename === 'Bot') continue
        const closing = pr.closingIssuesReferences.nodes.map((n: { number: number }) => n.number)
        for (const n of linkedIssues({ title: pr.title, body: pr.body, headRefName: pr.headRefName, closing }, known)) {
          byIssue.set(n, [...(byIssue.get(n) ?? []), pr.author.login])
        }
      }
      const last = prs.nodes.at(-1)
      after = prs.pageInfo.hasNextPage && last && last.updatedAt >= since ? prs.pageInfo.endCursor : null
    } while (after)
    authors.set(repo, byIssue)
  }

  // Add them, only where something changes.
  let changed = 0
  for (const [repo, byIssue] of authors) {
    for (const [n, logins] of byIssue) {
      const card = repos.get(repo)!.get(n)!
      const value = mergeWorkedOn(card.worked, logins)
      if (value === (card.worked ?? '')) continue
      if (!opts.dryRun) {
        await graphql(
          token,
          'mutation($p: ID!, $i: ID!, $f: ID!, $v: String!) { updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { text: $v } }) { clientMutationId } }',
          { p: projectId, i: card.itemId, f: fieldId, v: value },
        )
      }
      log(`${repo}#${n} worked on → ${value}`)
      changed++
    }
  }
  return changed
}
