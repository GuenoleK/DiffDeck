import { useEffect, useId, useState } from "react";
import type { Review } from "@diffdeck/core";
import { Button } from "../../../../shared/components/Button/Button.js";
import "./ReviewContextPanel.scss";

type ReviewContextPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contextSummary: string) => Promise<void>;
  review: Review;
};

export function ReviewContextPanel({ isOpen, onClose, onSave, review }: ReviewContextPanelProps) {
  const fieldId = useId();
  const serverSummary = review.contextSummary ?? "";
  const [summary, setSummary] = useState(serverSummary);
  const [savedSummary, setSavedSummary] = useState(serverSummary);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = summary !== savedSummary;

  useEffect(() => {
    setSummary(serverSummary);
    setSavedSummary(serverSummary);
  }, [review.id, serverSummary]);

  const save = async () => {
    setIsSaving(true);
    try {
      await onSave(summary);
      setSavedSummary(summary);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className={`review-context-panel__overlay ${isOpen ? "review-context-panel__overlay--visible" : ""}`}
        onClick={onClose}
      />
      <aside
        aria-hidden={!isOpen}
        aria-label="Review context"
        className={`review-context-panel ${isOpen ? "review-context-panel--open" : ""}`}
      >
        <header className="review-context-panel__header">
          <div>
            <p className="review-context-panel__eyebrow">Context</p>
            <h2 className="review-context-panel__title">Functional summary</h2>
          </div>
          <Button aria-label="Close context panel" onClick={onClose}>
            Close
          </Button>
        </header>

        <label className="review-context-panel__label" htmlFor={fieldId}>
          Ticket, rules, acceptance criteria
        </label>
        <textarea
          className="review-context-panel__textarea"
          id={fieldId}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="No functional context has been provided yet."
          rows={14}
          value={summary}
        />
        <footer className="review-context-panel__footer">
          {isDirty ? <span className="review-context-panel__state">Unsaved</span> : null}
          <Button disabled={!isDirty || isSaving} onClick={() => void save()} variant="primary">
            {isSaving ? "Saving" : "Save context"}
          </Button>
        </footer>
      </aside>
    </>
  );
}
