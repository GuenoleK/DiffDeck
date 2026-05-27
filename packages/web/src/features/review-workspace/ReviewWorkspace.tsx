import { useEffect, useState } from "react";
import type { ReviewSnapshot } from "@diffdeck/core";
import { getActiveReview, updateFinding } from "../../core/diffdeck-api.js";
import { FindingCard } from "../finding-card/FindingCard.js";
import { ReviewSummary } from "./components/ReviewSummary/ReviewSummary.js";
import "./ReviewWorkspace.scss";

export function ReviewWorkspace() {
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | undefined>();

  const refresh = async () => {
    setSnapshot(await getActiveReview());
  };

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <section className="review-workspace">
      <header className="review-workspace__header">
        <div>
          <p className="review-workspace__eyebrow">DiffDeck</p>
          <h1 className="review-workspace__title">{snapshot?.review.title ?? "Review workspace"}</h1>
        </div>
        {snapshot ? <ReviewSummary snapshot={snapshot} /> : null}
      </header>

      <div className="review-workspace__content">
        {snapshot?.findings.length ? (
          snapshot.findings.map((finding) => (
            <FindingCard
              finding={finding}
              key={finding.id}
              onStatusChange={async (status) => {
                await updateFinding(finding.id, { status });
                await refresh();
              }}
            />
          ))
        ) : (
          <div className="review-workspace__empty">
            <h2 className="review-workspace__empty-title">Waiting for findings</h2>
            <p className="review-workspace__empty-text">
              Start the MCP server and ask an AI agent to add draft review findings.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
