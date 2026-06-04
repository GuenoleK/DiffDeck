import { useEffect, useState } from "react";
import type { ReviewSnapshot } from "@diffdeck/core";
import {
  addConversationMessage,
  clearConversation,
  getActiveReview,
  importReviewSession,
  resetActiveReview,
  updateActiveReview,
  updateFinding,
} from "../../core/diffdeck-api.js";
import { FindingCard } from "../finding-card/FindingCard.js";
import { ReviewDiffPage } from "../review-diff/ReviewDiffPage.js";
import type { ReviewDiffContext } from "../review-diff/review-diff-context.js";
import { PublicationQueue } from "./components/PublicationQueue/PublicationQueue.js";
import { ResetReviewDialog } from "./components/ResetReviewDialog/ResetReviewDialog.js";
import { ReviewConversationPanel } from "./components/ReviewConversationPanel/ReviewConversationPanel.js";
import { ReviewContextPanel } from "./components/ReviewContextPanel/ReviewContextPanel.js";
import { ReviewSharePanel } from "./components/ReviewSharePanel/ReviewSharePanel.js";
import { ReviewSummary } from "./components/ReviewSummary/ReviewSummary.js";
import { ReviewUsageSummary } from "./components/ReviewUsageSummary/ReviewUsageSummary.js";
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
  const [activeView, setActiveView] = useState<"findings" | "diffs">("findings");
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [conversationFindingId, setConversationFindingId] = useState<string | undefined>();
  const [diffContext, setDiffContext] = useState<ReviewDiffContext>({ filePaths: [] });
  const approvedFindings = snapshot?.findings.filter((finding) => finding.status === "approved") ?? [];
  const unresolvedCount =
    snapshot?.findings.filter((finding) => finding.status === "draft" || finding.status === "approved").length ?? 0;
  const fileDiffs = snapshot?.fileDiffs ?? [];
  const fileDiffCount = fileDiffs.length;
  const hasContext = Boolean(snapshot?.review.contextSummary?.trim());
  const reviewTarget = formatReviewTarget(snapshot);
  const hasDiffConversationContext = diffContext.filePaths.length > 0 || Boolean(diffContext.line);

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
      <div className="review-workspace__main">
        <header className="review-workspace__header">
          <div className="review-workspace__review-overview">
            <div className="review-workspace__identity">
              <div className="review-workspace__heading">
                <p className="review-workspace__eyebrow">DiffDeck</p>
                <h1 className="review-workspace__title">{snapshot?.review.title ?? "Review workspace"}</h1>
                <p className="review-workspace__subtitle">{reviewTarget}</p>
              </div>
            </div>
            {snapshot ? (
              <div className="review-workspace__review-controls">
                <div className="review-workspace__button-row">
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
                </div>
                <ReviewSummary snapshot={snapshot} />
              </div>
            ) : null}
          </div>
          {snapshot ? <ReviewUsageSummary usage={snapshot.usage} /> : null}
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
            setConversationFindingId(undefined);
            setDiffContext({ filePaths: [] });
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
              <p className="review-workspace__deck-kicker">{activeView === "findings" ? "Review deck" : "Code review"}</p>
              <h2 className="review-workspace__deck-title">
                {activeView === "findings" ? "Findings ready for human judgment" : "Processed file diffs"}
              </h2>
            </div>
            <div className="review-workspace__view-switch" aria-label="Workspace view">
              <button
                aria-pressed={activeView === "findings"}
                className={`review-workspace__view-button ${
                  activeView === "findings" ? "review-workspace__view-button--active" : ""
                }`}
                onClick={() => setActiveView("findings")}
                type="button"
              >
                Findings
                <span>{unresolvedCount}</span>
              </button>
              <button
                aria-pressed={activeView === "diffs"}
                className={`review-workspace__view-button ${
                  activeView === "diffs" ? "review-workspace__view-button--active" : ""
                }`}
                onClick={() => setActiveView("diffs")}
                type="button"
              >
                Diffs
                <span>{fileDiffCount}</span>
              </button>
            </div>
          </div>

          <div className="review-workspace__content">
            {activeView === "diffs" && snapshot ? (
              <ReviewDiffPage
                fileDiffs={fileDiffs}
                onContextChange={(context) => {
                  setDiffContext(context);
                  setConversationFindingId(undefined);
                }}
                selectedContext={diffContext}
              />
            ) : snapshot?.findings.length ? (
              snapshot.findings.map((finding) => (
                <FindingCard
                  finding={finding}
                  isConversationTarget={conversationFindingId === finding.id}
                  key={finding.id}
                  onAskAboutFinding={(targetFinding) => {
                    setConversationFindingId(targetFinding.id);
                    setDiffContext({ filePaths: [] });
                  }}
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
      </div>

      {snapshot ? (
        <ReviewConversationPanel
          onAsk={async ({ body, isReviewAttached, relatedFindingId }) => {
            const relatedFilePaths = hasDiffConversationContext ? diffContext.filePaths : undefined;
            const relatedLine = diffContext.line;
            await addConversationMessage({
              role: "human",
              body,
              isReviewAttached,
              relatedFindingId: hasDiffConversationContext ? undefined : relatedFindingId ?? conversationFindingId,
              relatedFilePath: relatedLine?.filePath ?? (relatedFilePaths?.length === 1 ? relatedFilePaths[0] : undefined),
              relatedFilePaths,
              relatedLine: relatedLine?.line,
              relatedLineSide: relatedLine?.side,
            });
            await refresh();
          }}
          onClearConversation={async () => {
            const nextSnapshot = await clearConversation();
            setSnapshot(nextSnapshot);
          }}
          onScopeChange={setConversationFindingId}
          onDiffContextClear={() => setDiffContext({ filePaths: [] })}
          selectedFindingId={conversationFindingId}
          selectedDiffContext={diffContext}
          snapshot={snapshot}
        />
      ) : null}
    </section>
  );
}
