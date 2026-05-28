import { useState } from "react";
import { Button } from "../../../../shared/components/Button/Button.js";
import "./ResetReviewDialog.scss";

type ResetReviewDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => Promise<void>;
};

export function ResetReviewDialog({ isOpen, onClose, onReset }: ResetReviewDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const canReset = confirmation.trim().toUpperCase() === "RESET";

  const reset = async () => {
    setIsResetting(true);
    try {
      await onReset();
      setConfirmation("");
      onClose();
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="reset-review-dialog" role="presentation">
      <div className="reset-review-dialog__overlay" onClick={onClose} />
      <section aria-modal="true" className="reset-review-dialog__content" role="dialog">
        <header>
          <p className="reset-review-dialog__eyebrow">Reset</p>
          <h2 className="reset-review-dialog__title">Clear current review</h2>
        </header>
        <p className="reset-review-dialog__text">
          This clears all findings, approvals, edited comments, and context from the active DiffDeck session.
        </p>
        <label className="reset-review-dialog__label">
          Type RESET to confirm
          <input
            className="reset-review-dialog__input"
            onChange={(event) => setConfirmation(event.target.value)}
            value={confirmation}
          />
        </label>
        <footer className="reset-review-dialog__actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!canReset || isResetting} onClick={() => void reset()} variant="primary">
            {isResetting ? "Resetting" : "Reset review"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
