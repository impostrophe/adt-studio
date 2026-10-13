import fs from "node:fs"
import { HTTPException } from "hono/http-exception"
import { resolveBookPaths } from "@adt/storage"
import { resolvePathWithin } from "./path-security.js"

/** Check before admission and again when queued work starts. Opening storage or
 * acquiring the legacy writer lease can otherwise recreate a deleted book: the
 * lease recreates an empty directory, so a bare directory is not proof. A real
 * book has its database, or, before its first extraction, its source PDF. A
 * stale write never recreates either file. */
export function requireExistingBook(label: string, booksDir: string): string {
  const { bookDir } = resolveBookPaths(label, booksDir)
  const isFile = (name: string) => {
    const file = resolvePathWithin(booksDir, label, name)
    return !!file && fs.existsSync(file) && fs.statSync(file).isFile()
  }
  if (!isFile(`${label}.db`) && !isFile(`${label}.pdf`)) {
    throw new HTTPException(404, { message: `Book not found: ${label}` })
  }
  return bookDir
}
