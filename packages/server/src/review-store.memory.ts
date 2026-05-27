import { randomUUID } from "node:crypto";
import type {
  CreateReviewInput,
  FindingDraftInput,
  FindingPatchInput,
} from "@diffdeck/core";
import type { Finding, Review, ReviewSnapshot } from "@diffdeck/core";

const nowIso = () => new Date().toISOString();

export class MemoryReviewStore {
  private activeReview: Review | undefined;
  private findings = new Map<string, Finding>();

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
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.activeReview = review;
    this.findings.clear();
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

  snapshot(): ReviewSnapshot {
    return {
      review: this.getOrCreateActiveReview(),
      findings: this.listFindings(),
    };
  }
}

export const reviewStore = new MemoryReviewStore();
