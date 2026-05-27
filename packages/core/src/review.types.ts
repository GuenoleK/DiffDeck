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

export type ReviewSnapshot = {
  review: Review;
  findings: Finding[];
};
