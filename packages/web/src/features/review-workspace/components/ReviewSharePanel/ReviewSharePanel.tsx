import { useEffect, useMemo, useState } from "react";
import type { Finding, Review } from "@diffdeck/core";
import { Button } from "../../../../shared/components/Button/Button.js";
import {
  createHtmlReport,
  createMarkdownReport,
  downloadTextFile,
} from "../../utils/review-report.js";
import "./ReviewSharePanel.scss";

type ReviewSharePanelProps = {
  findings: Finding[];
  isOpen: boolean;
  onClose: () => void;
  review: Review;
};

const getBaseFilename = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "diffdeck-review";

export function ReviewSharePanel({ findings, isOpen, onClose, review }: ReviewSharePanelProps) {
  const [format, setFormat] = useState<"markdown" | "html">("markdown");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const markdown = useMemo(() => createMarkdownReport({ findings, review }), [findings, review]);
  const html = useMemo(() => createHtmlReport({ findings, review }), [findings, review]);
  const content = format === "markdown" ? markdown : html;
  const baseFilename = getBaseFilename(review.title);

  useEffect(() => {
    if (copyState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <>
      <div
        className={`review-share-panel__overlay ${isOpen ? "review-share-panel__overlay--visible" : ""}`}
        onClick={onClose}
      />
      <aside
        aria-hidden={!isOpen}
        aria-label="Share approved review"
        className={`review-share-panel ${isOpen ? "review-share-panel--open" : ""}`}
        hidden={!isOpen}
        inert={!isOpen}
      >
        <header className="review-share-panel__header">
          <div>
            <p className="review-share-panel__eyebrow">Share</p>
            <h2 className="review-share-panel__title">Approved report</h2>
          </div>
          <Button aria-label="Close share panel" onClick={onClose}>
            Close
          </Button>
        </header>

        <p className="review-share-panel__text">
          Export approved comments with precise file and line references.
        </p>

        <div className="review-share-panel__formats" role="group" aria-label="Report format">
          <button
            aria-pressed={format === "markdown"}
            className={`review-share-panel__format ${format === "markdown" ? "review-share-panel__format--active" : ""}`}
            onClick={() => setFormat("markdown")}
            type="button"
          >
            Markdown
          </button>
          <button
            aria-pressed={format === "html"}
            className={`review-share-panel__format ${format === "html" ? "review-share-panel__format--active" : ""}`}
            onClick={() => setFormat("html")}
            type="button"
          >
            HTML
          </button>
        </div>

        <textarea className="review-share-panel__textarea" readOnly spellCheck={false} value={content} />

        <footer className="review-share-panel__footer">
          <span className={`review-share-panel__state review-share-panel__state--${copyState}`} aria-live="polite">
            {copyState === "copied" ? "Copied" : null}
            {copyState === "failed" ? "Copy failed" : null}
          </span>
          <div className="review-share-panel__actions">
            <Button disabled={!findings.length} onClick={() => void copyContent()}>
              Copy
            </Button>
            <Button
              disabled={!findings.length}
              onClick={() =>
                downloadTextFile(`${baseFilename}.md`, markdown, "text/markdown;charset=utf-8")
              }
            >
              Download MD
            </Button>
            <Button
              disabled={!findings.length}
              onClick={() => downloadTextFile(`${baseFilename}.html`, html, "text/html;charset=utf-8")}
              variant="primary"
            >
              Download HTML
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}
