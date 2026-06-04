import type {
  Review,
  ReviewConversationMessage,
  ReviewFileDiff,
  ReviewSnapshot,
  ReviewTokenUsage,
  ReviewUsageDraftInput,
} from "@diffdeck/core";

const averageCharsPerToken = 4;

function estimateTokens(value: string): number {
  const normalizedLength = value.replace(/\s+/g, " ").trim().length;
  return normalizedLength > 0 ? Math.ceil(normalizedLength / averageCharsPerToken) : 0;
}

function estimateJoinedTokens(values: Array<string | undefined>): number {
  return estimateTokens(values.filter(Boolean).join("\n"));
}

function hasTokenCount(usage: ReviewTokenUsage | undefined): boolean {
  return Boolean(
    usage &&
      (usage.totalTokens !== undefined || usage.inputTokens !== undefined || usage.outputTokens !== undefined),
  );
}

function withObservedEstimate(usage: ReviewTokenUsage | undefined, totalTokens: number, note: string): ReviewTokenUsage {
  if (hasTokenCount(usage) || totalTokens <= 0) {
    return usage ?? { confidence: "unavailable" };
  }

  return {
    ...usage,
    totalTokens,
    confidence: "observed",
    note: usage?.note ?? note,
  };
}

function estimateReviewMetadata(review: Review): number {
  return estimateJoinedTokens([review.title, review.sourceUrl, review.contextSummary]);
}

function estimateFileDiffs(fileDiffs: ReviewFileDiff[]): number {
  return estimateJoinedTokens(
    fileDiffs.map((fileDiff) =>
      [fileDiff.filePath, fileDiff.oldFilePath, fileDiff.status, fileDiff.language, fileDiff.unifiedDiff].join("\n"),
    ),
  );
}

function estimateFindingsAndConversation(snapshot: ReviewSnapshot): number {
  const findingText = snapshot.findings.map((finding) =>
    [
      finding.title,
      finding.severity,
      finding.status,
      finding.location.filePath,
      finding.location.line?.toString(),
      finding.location.endLine?.toString(),
      finding.codeSnippet,
      finding.explanation,
      finding.suggestion,
      finding.relationToChange,
      finding.confidence,
    ].join("\n"),
  );
  const conversationText = snapshot.conversation.map((message: ReviewConversationMessage) =>
    [
      message.role,
      message.body,
      message.relatedFindingId,
      message.relatedFilePath,
      message.relatedFilePaths?.join("\n"),
      message.relatedLine?.toString(),
      message.relatedLineSide,
    ].join("\n"),
  );

  return estimateJoinedTokens([...findingText, ...conversationText]);
}

function getTokenTotal(usage: ReviewTokenUsage | undefined): number | undefined {
  if (!usage) {
    return undefined;
  }

  if (usage.totalTokens !== undefined) {
    return usage.totalTokens;
  }

  if (usage.inputTokens !== undefined || usage.outputTokens !== undefined) {
    return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
  }

  return undefined;
}

export function addObservedUsageEstimates(
  input: ReviewUsageDraftInput,
  snapshot: ReviewSnapshot,
): ReviewUsageDraftInput {
  const projectTokens = estimateFileDiffs(snapshot.fileDiffs);
  const diffdeckTokens = estimateReviewMetadata(snapshot.review) + estimateFindingsAndConversation(snapshot);
  const project = withObservedEstimate(
    input.project,
    projectTokens,
    "Estimated from file diffs stored in DiffDeck.",
  );
  const diffdeck = withObservedEstimate(
    input.diffdeck,
    diffdeckTokens,
    "Estimated from review metadata, findings, and conversation stored in DiffDeck.",
  );
  const projectTotal = getTokenTotal(project);
  const diffdeckTotal = getTokenTotal(diffdeck);
  const totalEstimate = (projectTotal ?? 0) + (diffdeckTotal ?? 0);
  const total: ReviewTokenUsage =
    hasTokenCount(input.total) || totalEstimate <= 0
      ? input.total
      : {
          ...input.total,
          totalTokens: totalEstimate,
          confidence: "estimated",
          note: input.total.note ?? "Estimated from visible DiffDeck and project payloads; provider usage is unavailable.",
        };

  return {
    ...input,
    total,
    diffdeck,
    project,
  };
}
