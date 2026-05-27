import type { FindingDraftInput } from "@diffdeck/core";

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

  async addFinding(input: FindingDraftInput) {
    return this.post("/reviews/active/findings", input);
  }

  async listFindings() {
    const response = await fetch(`${this.baseUrl}/reviews/active/findings`);
    return response.json();
  }

  async markReadyForHumanReview() {
    return this.post("/reviews/active/ready", {});
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
}
