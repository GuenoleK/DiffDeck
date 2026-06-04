import type {
  FindingDraftInput,
  ReviewConversationMessage,
  ReviewFileDiff,
  ReviewFileDiffDraftInput,
  ReviewSnapshot,
  ReviewUsage,
  ReviewUsageDraftInput,
} from "@diffdeck/core";

const defaultBaseUrl = "http://127.0.0.1:4337/api";

export class DiffDeckClient {
  constructor(private readonly baseUrl = process.env.DIFFDECK_API_URL ?? defaultBaseUrl) {}

  async createReview(input: { title?: string; sourceUrl?: string; repositoryPath?: string }) {
    return this.post("/reviews", {
      title: input.title ?? "DiffDeck Review",
      sourceUrl: input.sourceUrl,
      repositoryPath: input.repositoryPath,
    });
  }

  async getActiveReview(): Promise<ReviewSnapshot> {
    return this.get("/reviews/active");
  }

  async resetReview() {
    return this.post("/reviews/active/reset", {});
  }

  async updateReviewContext(input: { contextSummary: string }) {
    return this.patch("/reviews/active", input);
  }

  async setReviewUsage(input: ReviewUsageDraftInput): Promise<ReviewUsage> {
    return this.put("/reviews/active/usage", input);
  }

  async addFinding(input: FindingDraftInput) {
    return this.post("/reviews/active/findings", input);
  }

  async listFindings() {
    return this.get("/reviews/active/findings");
  }

  async listApprovedFindings() {
    return this.get("/reviews/active/approved-findings");
  }

  async addFileDiff(input: ReviewFileDiffDraftInput): Promise<ReviewFileDiff> {
    return this.post("/reviews/active/file-diffs", input);
  }

  async replaceFileDiffs(input: ReviewFileDiffDraftInput[]): Promise<ReviewFileDiff[]> {
    return this.put("/reviews/active/file-diffs", input);
  }

  async listFileDiffs(): Promise<ReviewFileDiff[]> {
    return this.get("/reviews/active/file-diffs");
  }

  async listConversationMessages() {
    return this.get("/reviews/active/conversation");
  }

  async listPendingConversationMessages(): Promise<ReviewConversationMessage[]> {
    return this.get("/reviews/active/conversation/pending");
  }

  async addConversationReply(input: {
    body: string;
    isReviewAttached?: boolean;
    relatedMessageId?: string;
    relatedFindingId?: string;
    relatedFilePath?: string;
    relatedFilePaths?: string[];
    relatedLine?: number;
    relatedLineSide?: "old" | "new";
    agentName?: string;
  }) {
    return this.post("/reviews/active/conversation", {
      ...input,
      role: "agent",
    });
  }

  async markReadyForHumanReview() {
    return this.post("/reviews/active/ready", {});
  }

  private async get(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`);

    if (!response.ok) {
      throw new Error(`DiffDeck API error ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  private async post(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`DiffDeck API error ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  private async put(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`DiffDeck API error ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  private async patch(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`DiffDeck API error ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }
}
