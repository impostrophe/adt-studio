import fs from "node:fs"
import { HTTPException } from "hono/http-exception"
import { resolveBookPaths } from "@adt/storage"
import { resolvePathWithin } from "./path-security.js"

/** Check before admission and again when queued work starts. Opening storage or
 * acquiring the legacy writer lease can otherwise recreate a deleted book. */
export function requireExistingBook(label: string, booksDir: string): string {
  const { bookDir } = resolveBookPaths(label, booksDir)
  const database = resolvePathWithin(booksDir, label, `${label}.db`)
  if (!database || !fs.existsSync(database) || !fs.statSync(database).isFile()) {
    throw new HTTPException(404, { message: `Book not found: ${label}` })
  }
  return bookDir
}
