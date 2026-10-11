// "Worked on": everyone who did something on a card, kept in a text field on
// the Project (the issue is not touched). It answers "what have I worked on",
// which assignees cannot: the bot unassigns people when they finish a stage.
//
// Who counts: people credited for a stage (the bot's hand-off comments) and
// authors of the pull requests linked to the issue. Bots do not. People are
// only ever added, never removed.
//
// Stored as "@ana @bruna", so a view filters it with `worked-on:*@ana*`
// (GitHub matches text fields with wildcards; the @ keeps "@ana" from
// matching inside another word).

// "@ana @bruna" → ["ana", "bruna"]
export function parseWorkedOn(text: string | null | undefined): string[] {
  return (text ?? '').split(/[\s,]+/).map((s) => s.replace(/^@/, '').trim()).filter(Boolean)
}

export function formatWorkedOn(logins: string[]) {
  return logins.map((l) => `@${l}`).join(' ')
}

// The field's people plus new ones, in order of first appearance, without
// repeats (logins are case-insensitive) or bots.
export function mergeWorkedOn(current: string | null | undefined, ...more: string[][]) {
  const seen = new Map<string, string>()
  for (const login of [...parseWorkedOn(current), ...more.flat()]) {
    if (!login || login.endsWith('[bot]')) continue
    const key = login.toLowerCase()
    if (!seen.has(key)) seen.set(key, login)
  }
  return formatWorkedOn([...seen.values()])
}
