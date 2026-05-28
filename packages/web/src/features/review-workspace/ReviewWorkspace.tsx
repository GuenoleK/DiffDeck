import { useEffect, useState } from "react";
import type { ReviewSnapshot } from "@diffdeck/core";
import { getActiveReview, importReviewSession, updateActiveReview, updateFinding } from "../../core/diffdeck-api.js";
import { FindingCard } from "../finding-card/FindingCard.js";
import { PublicationQueue } from "./components/PublicationQueue/PublicationQueue.js";
import { ReviewContextPanel } from "./components/ReviewContextPanel/ReviewContextPanel.js";
import { ReviewSharePanel } from "./components/ReviewSharePanel/ReviewSharePanel.js";
import { ReviewSummary } from "./components/ReviewSummary/ReviewSummary.js";
import { SessionHandoffPanel } from "./components/SessionHandoffPanel/SessionHandoffPanel.js";
import "./ReviewWorkspace.scss";

export function ReviewWorkspace() {
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | undefined>();
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const approvedFindings = snapshot?.findings.filter((finding) => finding.status === "approved") ?? [];
  const hasContext = Boolean(snapshot?.review.contextSummary?.trim());

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
        {snapshot ? (
          <div className="review-workspace__header-actions">
            <button
              className={`review-workspace__context-button ${
                hasContext ? "review-workspace__context-button--has-context" : ""
              }`}
              onClick={() => setIsContextOpen(true)}
              type="button"
            >
              Context
            </button>
            <button
              className="review-workspace__context-button"
              onClick={() => setIsSessionOpen(true)}
              type="button"
            >
              Session
            </button>
            <ReviewSummary snapshot={snapshot} />
          </div>
        ) : null}
      </header>

      {snapshot ? (
        <ReviewContextPanel
          isOpen={isContextOpen}
          onClose={() => setIsContextOpen(false)}
          onSave={async (contextSummary) => {
            await updateActiveReview({ contextSummary });
            await refresh();
          }}
          review={snapshot.review}
        />
      ) : null}

      <SessionHandoffPanel
        isOpen={isSessionOpen}
        onClose={() => setIsSessionOpen(false)}
        onImport={async (session) => {
          const nextSnapshot = await importReviewSession(session);
          setSnapshot(nextSnapshot);
          setIsSessionOpen(false);
        }}
      />

      {snapshot ? (
        <ReviewSharePanel
          findings={approvedFindings}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          review={snapshot.review}
        />
      ) : null}

      {snapshot ? (
        <PublicationQueue
          approvedFindings={approvedFindings}
          onShare={() => setIsShareOpen(true)}
          review={snapshot.review}
        />
      ) : null}

      <div className="review-workspace__content">
        {snapshot?.findings.length ? (
          snapshot.findings.map((finding) => (
            <FindingCard
              finding={finding}
              key={finding.id}
              onFindingChange={async (patch) => {
                await updateFinding(finding.id, patch);
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
