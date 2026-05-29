import type {
  ConversationMessageDraftInput,
  Finding,
  FindingPatchInput,
  Review,
  ReviewConversationMessage,
  ReviewPatchInput,
  ReviewSession,
  ReviewSnapshot,
} from "@diffdeck/core";

const apiUrl = "/api";

export async function getActiveReview(): Promise<ReviewSnapshot> {
  const response = await fetch(`${apiUrl}/reviews/active`);
  return response.json();
}

export async function resetActiveReview(): Promise<ReviewSnapshot> {
  const response = await fetch(`${apiUrl}/reviews/active/reset`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to reset active review");
  }

  return response.json();
}

export async function getActiveReviewSession(): Promise<ReviewSession> {
  const response = await fetch(`${apiUrl}/reviews/active/session`);

  if (response.ok) {
    return response.json();
  }

  const snapshot = await getActiveReview();
  return {
    format: "diffdeck.session.v1",
    exportedAt: new Date().toISOString(),
    snapshot,
  };
}

export async function importReviewSession(session: ReviewSession): Promise<ReviewSnapshot> {
  const response = await fetch(`${apiUrl}/reviews/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(session),
  });

  if (!response.ok) {
    throw new Error("Unable to import review session");
  }

  return response.json();
}

export async function updateFinding(findingId: string, patch: FindingPatchInput): Promise<Finding> {
  const response = await fetch(`${apiUrl}/findings/${findingId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(`Unable to update finding ${findingId}`);
  }

  return response.json();
}

export async function updateActiveReview(patch: ReviewPatchInput): Promise<Review> {
  const response = await fetch(`${apiUrl}/reviews/active`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error("Unable to update active review");
  }

  return response.json();
}

export async function getApprovedFindings(): Promise<Finding[]> {
  const response = await fetch(`${apiUrl}/reviews/active/approved-findings`);

  if (!response.ok) {
    throw new Error("Unable to load approved findings");
  }

  return response.json();
}

export async function addConversationMessage(input: ConversationMessageDraftInput): Promise<ReviewConversationMessage> {
  const response = await fetch(`${apiUrl}/reviews/active/conversation`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Unable to add conversation message: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function clearConversation(): Promise<ReviewSnapshot> {
  const response = await fetch(`${apiUrl}/reviews/active/conversation`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Unable to clear conversation: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function openUrlInDefaultBrowser(url: string): Promise<void> {
  const response = await fetch(`${apiUrl}/system/open-url`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-diffdeck-intent": "open-url",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error("Unable to open URL in the default browser");
  }
}
