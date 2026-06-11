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
      "Use the browser mode I explicitly choose before opening or controlling any browser.",
      "Recommended browser priority: 1) Playwright MCP + Chrome Extension attached to my selected authenticated browser tab, 2) Playwright MCP with persistent profile, 3) Playwright MCP via CDP/remote debugging, 4) Chrome DevTools MCP for diagnostics or limited fallback, 5) integrated browser after I accept a separate session, 6) manual comments ready to paste.",
      "If I want my real authenticated browser, prefer Playwright MCP + Chrome Extension. Opening the URL in my default browser is not enough; the agent must be able to inspect the authenticated page and act from that browser context.",
      "Before placing comments, verify that the browser tool can see an authenticated review page, not only a sign-in page or an isolated browser page.",
      "If you cannot control the chosen browser mode from this session, stop and tell me what browser MCP/tool is missing. Do not switch to another mode unless I choose it.",
      "Before acting in GitLab, ask me which action level I want: 1) form-only prefill, 2) draft review comments, or 3) publish/submit.",
      "For GitLab level 2, prefer the Draft Notes API from the authenticated browser context: create draft notes without publishing.",
      "For GitLab level 3, use the Discussions API or publish drafts only after I explicitly confirm level 3.",
      "For GitLab API placement, fetch the latest MR version from /api/v4/projects/:project_id/merge_requests/:iid/versions, then create each note with explicit base_sha, start_sha, head_sha, position_type=text, old_path, new_path, and the target old_line or new_line.",
      "After each GitLab API creation, verify through the API that the note exists as a positioned diff note at the expected file and line before moving to the next finding.",
      "Use GitLab inline UI placement only as a strict fallback or visual verification path. If using UI fallback, confirm the opened textarea belongs to the target diff row, target file, and target line before filling or saving.",
      "Never fill a generic visible textarea, the last visible textarea, or a Reply to comment field unless I explicitly asked to reply to that existing thread.",
      "If I choose level 1, opening the target inline comment form and filling its textarea is sufficient; do not click Start a review or Add comment now.",
      "Never publish or submit anything unless I explicitly confirm level 3.",
      "Treat Chrome DevTools MCP as diagnostic or limited fallback for GitLab inline comments. On large virtualized diffs, existing thread reply textareas may remain visible; avoid JavaScript injection, DOM mutation scripts, and generic evaluate_script.",
      "When the browser work is finished, disconnect, detach, release, or stop the browser automation session if your tool supports it. Do not close my normal browser window or a preexisting selected tab unless I explicitly ask.",
      "If you opened a dedicated tab and the chosen mode allows it, you may close only that dedicated tab.",
      "If you cannot disconnect the browser connection from your side, tell me exactly how to do it for the current mode. For Playwright Extension, ask me to click Annuler in the extension to end the session. Explain that this releases the session and avoids the next run inheriting an unexpected browser state.",
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
