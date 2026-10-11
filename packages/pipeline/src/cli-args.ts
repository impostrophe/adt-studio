import path from "node:path"
import { z } from "zod"
import { BookLabel, SectioningResumeStage, STAGE_ORDER } from "@adt/types"

export const USAGE = `Usage: pnpm pipeline <label> <pdf-file> [options]

Arguments:
  label       Book label (used as directory name)
  pdf-file    Path to PDF file

Options:
  --start-page <n>    Start at page N (1-indexed)
  --end-page <n>      End at page N (inclusive)
  --books-dir <dir>   Books root directory (default: books)
  --concurrency <n>   Max parallel LLM calls (default: from config or 5)
  --from-stage <s>    Resume Sectioning or Storyboard from verified extraction
  --to-stage <s>      Last resumed stage: sectioning or storyboard (both required)
  --protected-replacements <file>  Confirm exact protected records from a JSON array
  -h, --help          Show this help`

const ParsedCliArgsSchema = z
  .object({
    label: BookLabel,
    pdfFile: z.string().min(1),
    startPage: z.coerce.number().int().positive().optional(),
    endPage: z.coerce.number().int().positive().optional(),
    booksDir: z.string().min(1).optional(),
    concurrency: z.coerce.number().int().positive().optional(),
    fromStage: SectioningResumeStage.optional(),
    toStage: SectioningResumeStage.optional(),
    protectedReplacementsFile: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.startPage === undefined ||
      value.endPage === undefined ||
      value.startPage <= value.endPage,
    {
      message: "--start-page must be less than or equal to --end-page",
      path: ["startPage"],
    }
  )

export interface ParsedCliArgs {
  fromStage?: SectioningResumeStage
  toStage?: SectioningResumeStage
  protectedReplacementsFile?: string
  label: string
  pdfPath: string
  startPage?: number
  endPage?: number
  booksRoot: string
  concurrency?: number
}

export function parseCliArgs(args: string[]): ParsedCliArgs {
  const positional: string[] = []
  let startPageRaw: string | undefined
  let endPageRaw: string | undefined
  let booksDirRaw: string | undefined
  let concurrencyRaw: string | undefined
  const resume: Record<string, string> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const resumeKeys: Record<string, string> = { "--from-stage": "fromStage", "--to-stage": "toStage", "--protected-replacements": "protectedReplacementsFile" }
    if (resumeKeys[arg]) {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Missing value for ${arg}`)
      resume[resumeKeys[arg]] = args[++i]
      continue
    }
    if (arg === "--start-page") {
      if (args[i + 1] === undefined) {
        throw new Error("Missing value for --start-page")
      }
      startPageRaw = args[++i]
      continue
    }
    if (arg === "--end-page") {
      if (args[i + 1] === undefined) {
        throw new Error("Missing value for --end-page")
      }
      endPageRaw = args[++i]
      continue
    }
    if (arg === "--books-dir") {
      if (args[i + 1] === undefined) {
        throw new Error("Missing value for --books-dir")
      }
      booksDirRaw = args[++i]
      continue
    }
    if (arg === "--concurrency") {
      if (args[i + 1] === undefined) {
        throw new Error("Missing value for --concurrency")
      }
      concurrencyRaw = args[++i]
      continue
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`)
    }
    positional.push(arg)
  }

  if (positional.length !== 2) {
    throw new Error("label and pdf-file are required")
  }

  const parsed = ParsedCliArgsSchema.safeParse({
    label: positional[0],
    pdfFile: positional[1],
    startPage: startPageRaw,
    endPage: endPageRaw,
    booksDir: booksDirRaw,
    concurrency: concurrencyRaw,
    ...resume,
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ")
    throw new Error(message)
  }
  const { fromStage, toStage, protectedReplacementsFile } = parsed.data
  if ((fromStage === undefined) !== (toStage === undefined)
    || (fromStage && toStage && STAGE_ORDER.indexOf(fromStage) > STAGE_ORDER.indexOf(toStage))
    || (protectedReplacementsFile && fromStage !== "sectioning")) {
    throw new Error("Specify an ordered --from-stage and --to-stage range; protected replacements require Sectioning")
  }

  return {
    fromStage, toStage,
    protectedReplacementsFile: protectedReplacementsFile ? path.resolve(protectedReplacementsFile) : undefined,
    label: parsed.data.label,
    pdfPath: path.resolve(parsed.data.pdfFile),
    startPage: parsed.data.startPage,
    endPage: parsed.data.endPage,
    booksRoot: path.resolve(parsed.data.booksDir ?? process.env.BOOKS_DIR ?? "books"),
    concurrency: parsed.data.concurrency,
  }
}
