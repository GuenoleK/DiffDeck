import { useEffect, useMemo, useState } from "react";
import type { Finding, Review } from "@diffdeck/core";
import { openUrlInDefaultBrowser } from "../../../../core/diffdeck-api.js";
import { Button } from "../../../../shared/components/Button/Button.js";
import "./PublicationQueue.scss";

type PublicationQueueProps = {
  approvedFindings: Finding[];
  onShare: () => void;
  review: Review;
};

export function PublicationQueue({ approvedFindings, onShare, review }: PublicationQueueProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [openState, setOpenState] = useState<"idle" | "opening" | "failed">("idle");
  const approvedCount = approvedFindings.length;
  const hasApprovedFindings = approvedCount > 0;

  const prompt = useMemo(() => {
    const reviewTarget = review.sourceUrl ?? "<MR_OR_PR_URL>";

    return [
      `Prefill the ${approvedCount} approved DiffDeck comment${approvedCount > 1 ? "s" : ""} on this review: ${reviewTarget}`,
      "Use the DiffDeck MCP tool list_approved_findings to retrieve only human-approved findings.",
      "You must pilot my default browser, not merely open it. Use a browser automation tool attached to that browser, such as Chrome DevTools MCP, so my existing authenticated session can be used.",
      "Before placing comments, verify that the browser tool can see an authenticated review page, not only a sign-in page or an isolated browser page.",
      "If you cannot control my default browser from this session, stop and tell me what browser MCP/tool is missing. Do not switch to another mode unless I choose it.",
      "Supported modes are: true session mode with my default browser, fallback mode with the integrated browser, or manual mode with comments ready to paste.",
      "Before acting in GitLab, ask me which action level I want: 1) form-only prefill, 2) draft review comments, or 3) publish/submit.",
      "For multiple comments, recommend level 2 because unsaved GitLab inline textareas can disappear across file navigation, scrolling, lazy loading, or collapsed/unloaded files.",
      "Once the browser mode and GitLab action level are known, use a fast path: retrieve approved findings once, verify authentication once, navigate directly to each file/line, fill the textarea immediately, then save the draft before moving on.",
      "On GitLab, if the target files or lines are collapsed or lazy-loaded, click Expand all files, Show file, or the equivalent visible expand control before trying to place inline comments.",
      "For GitLab level 2, fill the textarea, click Start a review for the first comment, then Add to review for subsequent comments. Do not click Add comment now, Submit review, Publish, Merge, or any final publication action.",
      "If I choose level 1, opening the inline comment form and filling its textarea is sufficient; do not click Start a review or Add comment now.",
      "Never publish or submit anything unless I explicitly confirm level 3.",
      "With Chrome DevTools MCP in my real browser, avoid JavaScript injection, DOM mutation scripts, and generic evaluate_script for GitLab prefill. Prefer snapshots, locator/accessibility clicks, keyboard input, and text filling. If a DevTools transport closes after an injection-style call, reconnect at most once and continue only with non-injection actions, or stop and explain the missing stable browser connection.",
      "When the browser work is finished, disconnect or detach the browser automation session if your tool supports it. Do not close my normal browser window unless I explicitly ask.",
      "If you cannot disconnect the browser connection from your side, tell me exactly how to do it for the current mode, for example stopping DevTools MCP, disabling remote debugging in chrome://inspect/#remote-debugging, closing a dedicated debugging browser, disconnecting the extension session, or closing the integrated browser session.",
    ].join("\n");
  }, [approvedCount, review.sourceUrl]);

  useEffect(() => {
    if (copyState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  useEffect(() => {
    if (openState !== "failed") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setOpenState("idle"), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [openState]);

  const copyPrompt = async () => {
    if (!hasApprovedFindings) {
      return;
    }

    try {
      await navigator.clipboard.writeText(prompt);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  const openReview = async () => {
    if (!review.sourceUrl) {
      return;
    }

    setOpenState("opening");

    try {
      await openUrlInDefaultBrowser(review.sourceUrl);
      setOpenState("idle");
    } catch {
      setOpenState("failed");
    }
  };

  return (
    <section
      className={`publication-queue ${hasApprovedFindings ? "publication-queue--ready" : "publication-queue--empty"}`}
      aria-label="Publication queue"
    >
      <div className="publication-queue__content">
        <p className="publication-queue__eyebrow">Human queue</p>
        <h2 className="publication-queue__title">
          {hasApprovedFindings
            ? `${approvedCount} approved comment${approvedCount > 1 ? "s" : ""} ready`
            : "Nothing approved yet"}
        </h2>
        <p className="publication-queue__text">
          {hasApprovedFindings
            ? "Open the review, copy the automation prompt, or export a clean report from the comments you already validated."
            : "Approve a finding to move it into a stable publication queue while the review list stays in place."}
        </p>
      </div>
      <div className="publication-queue__actions">
        {review.sourceUrl ? (
          <Button className="publication-queue__link" onClick={() => void openReview()}>
            {openState === "opening" ? "Opening" : "Open default browser"}
          </Button>
        ) : null}
        <Button disabled={!hasApprovedFindings} variant="primary" onClick={() => void copyPrompt()}>
          Copy automation prompt
        </Button>
        <Button disabled={!hasApprovedFindings} onClick={onShare}>
          Share report
        </Button>
        {openState === "failed" ? (
          <span className="publication-queue__copy-state publication-queue__copy-state--failed">
            Open failed
          </span>
        ) : null}
        {copyState !== "idle" ? (
          <span className={`publication-queue__copy-state publication-queue__copy-state--${copyState}`}>
            {copyState === "copied" ? "Copied" : "Copy failed"}
          </span>
        ) : null}
      </div>
    </section>
  );
}
