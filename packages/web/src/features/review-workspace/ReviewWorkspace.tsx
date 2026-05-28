import { useEffect, useState } from "react";
import type { ReviewSnapshot } from "@diffdeck/core";
import {
  getActiveReview,
  importReviewSession,
  resetActiveReview,
  updateActiveReview,
  updateFinding,
} from "../../core/diffdeck-api.js";
import { FindingCard } from "../finding-card/FindingCard.js";
import { PublicationQueue } from "./components/PublicationQueue/PublicationQueue.js";
import { ResetReviewDialog } from "./components/ResetReviewDialog/ResetReviewDialog.js";
import { ReviewContextPanel } from "./components/ReviewContextPanel/ReviewContextPanel.js";
import { ReviewSharePanel } from "./components/ReviewSharePanel/ReviewSharePanel.js";
import { ReviewSummary } from "./components/ReviewSummary/ReviewSummary.js";
import { SessionHandoffPanel } from "./components/SessionHandoffPanel/SessionHandoffPanel.js";
import "./ReviewWorkspace.scss";

function formatReviewTarget(snapshot: ReviewSnapshot | undefined): string {
  if (!snapshot) {
    return "Local pre-review workspace";
  }

  if (snapshot.review.repositoryPath) {
    return snapshot.review.repositoryPath;
  }

  if (snapshot.review.sourceUrl) {
    try {
      return new URL(snapshot.review.sourceUrl).hostname;
    } catch {
      return snapshot.review.sourceUrl;
    }
  }

  return "Local pre-review workspace";
}

export function ReviewWorkspace() {
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | undefined>();
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const approvedFindings = snapshot?.findings.filter((finding) => finding.status === "approved") ?? [];
  const unresolvedCount =
    snapshot?.findings.filter((finding) => finding.status === "draft" || finding.status === "approved").length ?? 0;
  const hasContext = Boolean(snapshot?.review.contextSummary?.trim());
  const reviewTarget = formatReviewTarget(snapshot);

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
        <div className="review-workspace__identity">
          <div className="review-workspace__heading">
            <p className="review-workspace__eyebrow">DiffDeck</p>
            <h1 className="review-workspace__title">{snapshot?.review.title ?? "Review workspace"}</h1>
            <p className="review-workspace__subtitle">{reviewTarget}</p>
          </div>
        </div>
        {snapshot ? (
          <div className="review-workspace__header-actions">
            <button
              className={`review-workspace__tool-button ${
                hasContext ? "review-workspace__tool-button--has-context" : ""
              }`}
              onClick={() => setIsContextOpen(true)}
              type="button"
            >
              Context
            </button>
            <button
              className="review-workspace__tool-button"
              onClick={() => setIsSessionOpen(true)}
              type="button"
            >
              Session
            </button>
            <button
              className="review-workspace__tool-button review-workspace__tool-button--danger"
              onClick={() => setIsResetOpen(true)}
              type="button"
            >
              Reset
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

      <ResetReviewDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onReset={async () => {
          const nextSnapshot = await resetActiveReview();
          setSnapshot(nextSnapshot);
          setIsContextOpen(false);
          setIsShareOpen(false);
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

      <div className="review-workspace__deck">
        <div className="review-workspace__deck-header">
          <div>
            <p className="review-workspace__deck-kicker">Review deck</p>
            <h2 className="review-workspace__deck-title">Findings ready for human judgment</h2>
          </div>
          <span className="review-workspace__deck-count">{unresolvedCount} open</span>
        </div>

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
              <h2 className="review-workspace__empty-title">No findings in the deck</h2>
              <p className="review-workspace__empty-text">
                Start a review session to collect structured comments, then approve only the ones worth publishing.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
