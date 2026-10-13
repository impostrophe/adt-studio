import { z } from "zod"

/**
 * Max upscale for a fixed-layout page filling its viewport. Shared by the
 * storyboard editor (`BookPreviewFrame`) and the packaged reader's fit script
 * (`renderPageHtml`) so the preview/export matches the size the user edits at.
 * 2× keeps rasterised art from getting too soft.
 */
export const FIXED_LAYOUT_MAX_SCALE = 2

export const SectionRendering = z.object({
  /** Stable owner captured when this rendering is published; never an index. */
  sectionId: z.string().min(1).optional(),
  /** Explicit ownership repair; signature binds identity declarations. Version
   * guards protect the reviewed content; this is never generation provenance. */
  ownerReview: z.object({
    signature: z.string(),
    renderingVersion: z.number().int().positive(),
    sectioningNode: z.enum(["page-sectioning", "fixed-layout-sectioning"]),
    sectioningVersion: z.number().int().positive(),
  }).optional(),
  sectionIndex: z.number().int(),
  sectionType: z.string(),
  reasoning: z.string(),
  html: z.string(),
  activityReasoning: z.string().optional(),
  activityAnswers: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
    .optional(),
})
export type SectionRendering = z.infer<typeof SectionRendering>

export const WebRenderingOutput = z.object({
  sections: z.array(SectionRendering),
})
export type WebRenderingOutput = z.infer<typeof WebRenderingOutput>

/** Successful historical custom-activity tool result; version identifies the
 * exact rendering snapshot, so its index is never applied to a later array. */
export const ActivityCreationReceipt = z.object({
  ok: z.literal(true),
  sectionId: z.string().min(1),
  sectionIndex: z.number().int().nonnegative(),
  version: z.number().int().positive(),
})
export type ActivityCreationReceipt = z.infer<typeof ActivityCreationReceipt>

export const RepairRenderingOwner = z.object({
  renderingVersion: z.number().int().positive(),
  sectioningNode: z.enum(["page-sectioning", "fixed-layout-sectioning"]),
  sectioningVersion: z.number().int().positive(),
  renderingIndex: z.number().int().nonnegative(),
  sectionId: z.string().min(1),
})
export type RepairRenderingOwner = z.infer<typeof RepairRenderingOwner>

export const RenderingOwnershipRepair = z.object({
  renderingVersion: z.number().int().positive(),
  sectioningNode: z.enum(["page-sectioning", "fixed-layout-sectioning"]),
  sectioningVersion: z.number().int().positive(),
  unresolved: z.array(z.object({ renderingIndex: z.number().int(), rendering: SectionRendering })),
  choices: z.array(z.object({ sectionId: z.string(), sectionType: z.string(), text: z.string() })),
})
export type RenderingOwnershipRepair = z.infer<typeof RenderingOwnershipRepair>

export const webRenderingLLMSchema = z.object({
  reasoning: z.string(),
  content: z.string(),
})

export const activityAnswersLLMSchema = z.object({
  reasoning: z.string(),
  answers: z.array(
    z.object({
      id: z.string(),
      value: z.union([z.string(), z.boolean(), z.number()]),
    })
  ),
})

export const visualReviewLLMSchema = z.object({
  approved: z.boolean(),
  reasoning: z.string(),
  content: z.string(),
})

export const editVerifyLLMSchema = z.object({
  applied: z.boolean(),
  reason: z.string(),
})
