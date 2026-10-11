import { describe, expect, it } from 'vitest'
import { mergeWorkedOn, parseWorkedOn } from './worked.ts'

describe('Worked on', () => {
  it('reads the field, with or without @ and commas', () => {
    expect(parseWorkedOn('@ana @bruna')).toEqual(['ana', 'bruna'])
    expect(parseWorkedOn('ana, bruna')).toEqual(['ana', 'bruna'])
    expect(parseWorkedOn(null)).toEqual([])
  })

  it('adds new people after the ones already there', () => {
    expect(mergeWorkedOn('@ana', ['bruna'], ['caio'])).toBe('@ana @bruna @caio')
  })

  it('never lists someone twice, whatever the case', () => {
    expect(mergeWorkedOn('@Ana', ['ana', 'bruna'], ['BRUNA'])).toBe('@Ana @bruna')
  })

  it('leaves bots out', () => {
    expect(mergeWorkedOn('', ['dependabot[bot]', 'ana', 'copilot-swe-agent[bot]'])).toBe('@ana')
  })

  it('keeps everyone already there: people are only added', () => {
    expect(mergeWorkedOn('@ana @bruna', [])).toBe('@ana @bruna')
  })
})
