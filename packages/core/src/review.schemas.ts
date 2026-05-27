import { z } from "zod";
import {
  confidenceValues,
  findingSeverities,
  findingStatuses,
  relationToChangeValues,
} from "./review.constants.js";

export const FindingLocationSchema = z.object({
  filePath: z.string().min(1),
  line: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  platformUrl: z.string().url().optional(),
});

export const CreateReviewSchema = z.object({
  title: z.string().min(1).default("Untitled review"),
  sourceUrl: z.string().url().optional(),
  repositoryPath: z.string().optional(),
});

export const FindingDraftSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(findingSeverities),
  location: FindingLocationSchema,
  codeSnippet: z.string().optional(),
  explanation: z.string().min(1),
  suggestion: z.string().optional(),
  relationToChange: z.enum(relationToChangeValues).optional(),
  confidence: z.enum(confidenceValues).optional(),
  agentName: z.string().optional(),
});

export const FindingPatchSchema = z.object({
  title: z.string().min(1).optional(),
  severity: z.enum(findingSeverities).optional(),
  status: z.enum(findingStatuses).optional(),
  location: FindingLocationSchema.optional(),
  codeSnippet: z.string().optional(),
  explanation: z.string().min(1).optional(),
  suggestion: z.string().optional(),
  relationToChange: z.enum(relationToChangeValues).optional(),
  confidence: z.enum(confidenceValues).optional(),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type FindingDraftInput = z.infer<typeof FindingDraftSchema>;
export type FindingPatchInput = z.infer<typeof FindingPatchSchema>;
