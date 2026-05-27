import type { Finding, FindingPatchInput, ReviewSnapshot } from "@diffdeck/core";

const apiUrl = "/api";

export async function getActiveReview(): Promise<ReviewSnapshot> {
  const response = await fetch(`${apiUrl}/reviews/active`);
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
