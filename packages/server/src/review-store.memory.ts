import { randomUUID } from "node:crypto";
import type {
  ConversationMessageDraftInput,
  CreateReviewInput,
  FindingDraftInput,
  FindingPatchInput,
  ReviewSession,
  ReviewSessionInput,
  ReviewPatchInput,
} from "@diffdeck/core";
import type { Finding, Review, ReviewConversationMessage, ReviewSnapshot } from "@diffdeck/core";

const nowIso = () => new Date().toISOString();

export class MemoryReviewStore {
  private activeReview: Review | undefined;
  private findings = new Map<string, Finding>();
  private conversation = new Map<string, ReviewConversationMessage>();

  getOrCreateActiveReview(): Review {
    if (this.activeReview) {
      return this.activeReview;
    }

    return this.createReview({ title: "DiffDeck Review" });
  }

  createReview(input: CreateReviewInput): Review {
    const timestamp = nowIso();
    const review: Review = {
      id: randomUUID(),
      title: input.title,
      sourceUrl: input.sourceUrl,
      repositoryPath: input.repositoryPath,
      contextSummary: input.contextSummary,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.activeReview = review;
    this.findings.clear();
    this.conversation.clear();
    return review;
  }

  markReadyForHumanReview(): Review {
    const review = this.getOrCreateActiveReview();
    this.activeReview = {
      ...review,
      status: "ready_for_human_review",
      updatedAt: nowIso(),
    };
    return this.activeReview;
  }

  updateActiveReview(patch: ReviewPatchInput): Review {
    const review = this.getOrCreateActiveReview();
    this.activeReview = {
      ...review,
      ...patch,
      updatedAt: nowIso(),
    };
    return this.activeReview;
  }

  addFinding(input: FindingDraftInput): Finding {
    const review = this.getOrCreateActiveReview();
    const timestamp = nowIso();
    const finding: Finding = {
      ...input,
      id: randomUUID(),
      reviewId: review.id,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.findings.set(finding.id, finding);
    return finding;
  }

  listFindings(): Finding[] {
    return [...this.findings.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  listApprovedFindings(): Finding[] {
    return this.listFindings().filter((finding) => finding.status === "approved");
  }

  updateFinding(findingId: string, patch: FindingPatchInput): Finding | undefined {
    const existing = this.findings.get(findingId);
    if (!existing) {
      return undefined;
    }

    const updated: Finding = {
      ...existing,
      ...patch,
      updatedAt: nowIso(),
    };

    this.findings.set(findingId, updated);
    return updated;
  }

  deleteFinding(findingId: string): boolean {
    return this.findings.delete(findingId);
  }

  addConversationMessage(input: ConversationMessageDraftInput): ReviewConversationMessage {
    const review = this.getOrCreateActiveReview();
    const message: ReviewConversationMessage = {
      ...input,
      id: randomUUID(),
      reviewId: review.id,
      createdAt: nowIso(),
    };

    this.conversation.set(message.id, message);
    return message;
  }

  listConversationMessages(): ReviewConversationMessage[] {
    return [...this.conversation.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  listPendingConversationMessages(): ReviewConversationMessage[] {
    const messages = this.listConversationMessages();
    const answeredMessageIds = new Set(
      messages
        .filter((message) => message.role === "agent" && message.relatedMessageId)
        .map((message) => message.relatedMessageId),
    );

    return messages.filter((message) => message.role === "human" && !answeredMessageIds.has(message.id));
  }

  clearConversation(): ReviewSnapshot {
    this.conversation.clear();
    return this.snapshot();
  }

  exportSession(): ReviewSession {
    return {
      format: "diffdeck.session.v1",
      exportedAt: nowIso(),
      snapshot: this.snapshot(),
    };
  }

  importSession(session: ReviewSessionInput): ReviewSnapshot {
    const review = session.snapshot.review;
    const findings = session.snapshot.findings.map((finding) => ({
      ...finding,
      reviewId: review.id,
    }));
    const conversation = session.snapshot.conversation.map((message) => ({
      ...message,
      reviewId: review.id,
    }));

    this.activeReview = review;
    this.findings.clear();
    this.conversation.clear();
    findings.forEach((finding) => this.findings.set(finding.id, finding));
    conversation.forEach((message) => this.conversation.set(message.id, message));
    return this.snapshot();
  }

  reset(): ReviewSnapshot {
    this.activeReview = undefined;
    this.findings.clear();
    this.conversation.clear();
    return this.snapshot();
  }

  snapshot(): ReviewSnapshot {
    return {
      review: this.getOrCreateActiveReview(),
      findings: this.listFindings(),
      conversation: this.listConversationMessages(),
    };
  }
}

export const reviewStore = new MemoryReviewStore();
