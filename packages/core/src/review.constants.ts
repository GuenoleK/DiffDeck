export const findingSeverities = [
  "critical",
  "important",
  "suggestion",
  "question",
  "praise",
] as const;

export const findingStatuses = [
  "draft",
  "approved",
  "rejected",
  "resolved",
  "posted",
] as const;

export const relationToChangeValues = [
  "introduced",
  "new_surface",
  "worsened",
  "preexisting_context",
] as const;

export const confidenceValues = ["low", "medium", "high"] as const;
