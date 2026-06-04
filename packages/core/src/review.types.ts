import type {
  confidenceValues,
  findingSeverities,
  findingStatuses,
  relationToChangeValues,
} from "./review.constants.js";

export type FindingSeverity = (typeof findingSeverities)[number];
export type FindingStatus = (typeof findingStatuses)[number];
export type RelationToChange = (typeof relationToChangeValues)[number];
export type FindingConfidence = (typeof confidenceValues)[number];

export type ReviewStatus = "draft" | "ready_for_human_review" | "closed";
export type ConversationRole = "human" | "agent";
export type ReviewFileStatus = "added" | "modified" | "deleted" | "renamed" | "copied" | "unchanged";
export type ReviewLineSide = "old" | "new";
export type ReviewUsageConfidence = "exact" | "estimated" | "observed" | "unavailable";

export type FindingLocation = {
  filePath: string;
  line?: number;
  endLine?: number;
  platformUrl?: string;
};

export type Review = {
  id: string;
  title: string;
  sourceUrl?: string;
  repositoryPath?: string;
  contextSummary?: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export type Finding = {
  id: string;
  reviewId: string;
  title: string;
  severity: FindingSeverity;
  status: FindingStatus;
  location: FindingLocation;
  codeSnippet?: string;
  explanation: string;
  suggestion?: string;
  relationToChange?: RelationToChange;
  confidence?: FindingConfidence;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewFileDiff = {
  id: string;
  reviewId: string;
  filePath: string;
  oldFilePath?: string;
  status: ReviewFileStatus;
  language?: string;
  unifiedDiff: string;
  additions?: number;
  deletions?: number;
  isGenerated?: boolean;
  agentName?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewConversationMessage = {
  id: string;
  reviewId: string;
  role: ConversationRole;
  body: string;
  isReviewAttached: boolean;
  relatedMessageId?: string;
  relatedFindingId?: string;
  relatedFilePath?: string;
  relatedFilePaths?: string[];
  relatedLine?: number;
  relatedLineSide?: ReviewLineSide;
  agentName?: string;
  createdAt: string;
};

export type ReviewTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  estimatedCostUsd?: number;
  confidence: ReviewUsageConfidence;
  note?: string;
};

export type ReviewUsage = {
  provider?: string;
  model?: string;
  agentName?: string;
  total: ReviewTokenUsage;
  diffdeck?: ReviewTokenUsage;
  project?: ReviewTokenUsage;
  other?: ReviewTokenUsage;
  recordedAt: string;
  note?: string;
};

export type ReviewSnapshot = {
  review: Review;
  findings: Finding[];
  fileDiffs: ReviewFileDiff[];
  conversation: ReviewConversationMessage[];
  usage?: ReviewUsage;
};

export type ReviewSession = {
  format: "diffdeck.session.v1";
  exportedAt: string;
  snapshot: ReviewSnapshot;
};
