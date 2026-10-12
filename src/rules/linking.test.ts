import { describe, expect, it } from 'vitest'
import { isSpecPr, issueNumberFromBranch, issueNumbersFromBody, linkedIssues } from './linking'

// Titles, branches and bodies below are taken from unicef/adt-studio.
describe('issueNumberFromBranch', () => {
  it.each([
    ['spec/890-per-element-audio', 890],
    ['fix/846-gemini-tts-diagnostics', 846],
    ['issue-705', 705],
    ['codex/fix-812-template-heading-container', 812],
    ['eliezir/935-topbar-drag-strip', 935],
    ['docs/sdd-onboarding-gaps', null],
    ['codex/local-gemma-audit', null],
    ['feat/publish-hosting-access-v2', null],
    ['spec/SPEC-0009-validation-fix-routing', null],
    ['spec/SPEC-0014-890-audio', 890],
  ])('%s → %s', (branch, expected) => {
    expect(issueNumberFromBranch(branch)).toBe(expected)
  })
})

describe('issueNumbersFromBody', () => {
  it('reads the PR template and closing keywords', () => {
    expect(issueNumbersFromBody('## Summary\n**Issue:** #890\n**Lane:** spec')).toEqual([890])
    expect(issueNumbersFromBody('Fixes #12 and closes #13. Part of #14')).toEqual([12, 13, 14])
    expect(issueNumbersFromBody('See discussion in #99')).toEqual([])
  })
})

describe('linkedIssues', () => {
  const known = new Set([705, 902, 935, 940])
  it('finds the issue from the branch, the body or GitHub link', () => {
    expect(linkedIssues({ title: 'Round-trip import', body: '', headRefName: 'issue-705', closing: [] }, known)).toEqual([705])
    expect(linkedIssues({ title: 'Beta update banner', body: '**Issue:** #902', headRefName: 'eliezir/beta-update-banner-settings', closing: [] }, known)).toEqual([902])
    expect(linkedIssues({ title: 'Validation labels', body: 'Closes #940', headRefName: 'fix/940-validation-page-labels', closing: [940] }, known)).toEqual([940])
  })
  it('ignores numbers that are not issues on the board', () => {
    expect(linkedIssues({ title: 'Release v0.8.1', body: 'Fixes #635, fixes #775', headRefName: 'release/v0.8.1', closing: [] }, known)).toEqual([])
  })
})

describe('isSpecPr', () => {
  it('a PR adding a spec file is a spec PR; editing only the index is not', () => {
    expect(isSpecPr(['docs/specs/INDEX.md', 'docs/specs/SPEC-0014-per-element-audio.md'])).toBe(true)
    expect(isSpecPr(['docs/specs/INDEX.md'])).toBe(false)
    expect(isSpecPr(['apps/api/src/import.ts'])).toBe(false)
  })
})
