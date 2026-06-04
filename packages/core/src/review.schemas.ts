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
  contextSummary: z.string().optional(),
});

export const ReviewPatchSchema = z.object({
  title: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  repositoryPath: z.string().optional(),
  contextSummary: z.string().optional(),
});

export const ReviewSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  repositoryPath: z.string().optional(),
  contextSummary: z.string().optional(),
  status: z.enum(["draft", "ready_for_human_review", "closed"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
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

export const FindingSchema = FindingDraftSchema.extend({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  status: z.enum(findingStatuses),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const ReviewFileDiffDraftSchema = z.object({
  filePath: z.string().min(1),
  oldFilePath: z.string().min(1).optional(),
  status: z.enum(["added", "modified", "deleted", "renamed", "copied", "unchanged"]),
  language: z.string().min(1).optional(),
  unifiedDiff: z.string().min(1),
  additions: z.number().int().nonnegative().optional(),
  deletions: z.number().int().nonnegative().optional(),
  isGenerated: z.boolean().optional(),
  agentName: z.string().optional(),
});

export const ReviewFileDiffSchema = ReviewFileDiffDraftSchema.extend({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const ConversationMessageDraftSchema = z.object({
  role: z.enum(["human", "agent"]),
  body: z.string().min(1),
  isReviewAttached: z.boolean().default(true),
  relatedMessageId: z.string().min(1).optional(),
  relatedFindingId: z.string().min(1).optional(),
  relatedFilePath: z.string().min(1).optional(),
  relatedFilePaths: z.array(z.string().min(1)).optional(),
  relatedLine: z.number().int().positive().optional(),
  relatedLineSide: z.enum(["old", "new"]).optional(),
  agentName: z.string().optional(),
});

export const ConversationMessageSchema = ConversationMessageDraftSchema.extend({
  id: z.string().min(1),
  reviewId: z.string().min(1),
  createdAt: z.string().min(1),
});

export const ReviewTokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  cachedInputTokens: z.number().int().nonnegative().optional(),
  reasoningTokens: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  confidence: z.enum(["exact", "estimated", "observed", "unavailable"]),
  note: z.string().optional(),
});

export const ReviewUsageDraftSchema = z.object({
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  agentName: z.string().min(1).optional(),
  total: ReviewTokenUsageSchema,
  diffdeck: ReviewTokenUsageSchema.optional(),
  project: ReviewTokenUsageSchema.optional(),
  other: ReviewTokenUsageSchema.optional(),
  note: z.string().optional(),
});

export const ReviewUsageSchema = ReviewUsageDraftSchema.extend({
  recordedAt: z.string().min(1),
});

export const ReviewSnapshotSchema = z.object({
  review: ReviewSchema,
  findings: z.array(FindingSchema),
  fileDiffs: z.array(ReviewFileDiffSchema).default([]),
  conversation: z.array(ConversationMessageSchema).default([]),
  usage: ReviewUsageSchema.optional(),
});

export const ReviewSessionSchema = z.object({
  format: z.literal("diffdeck.session.v1"),
  exportedAt: z.string().min(1),
  snapshot: ReviewSnapshotSchema,
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type ReviewPatchInput = z.infer<typeof ReviewPatchSchema>;
export type FindingDraftInput = z.infer<typeof FindingDraftSchema>;
export type FindingPatchInput = z.infer<typeof FindingPatchSchema>;
export type ReviewFileDiffDraftInput = z.infer<typeof ReviewFileDiffDraftSchema>;
export type ConversationMessageDraftInput = z.infer<typeof ConversationMessageDraftSchema>;
export type ReviewUsageDraftInput = z.infer<typeof ReviewUsageDraftSchema>;
export type ReviewSessionInput = z.infer<typeof ReviewSessionSchema>;
