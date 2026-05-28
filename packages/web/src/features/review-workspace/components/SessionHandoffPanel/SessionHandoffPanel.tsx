import { useEffect, useId, useState } from "react";
import type { ReviewSession } from "@diffdeck/core";
import { getActiveReviewSession } from "../../../../core/diffdeck-api.js";
import { Button } from "../../../../shared/components/Button/Button.js";
import "./SessionHandoffPanel.scss";

type SessionHandoffPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onImport: (session: ReviewSession) => Promise<void>;
};

export function SessionHandoffPanel({ isOpen, onClose, onImport }: SessionHandoffPanelProps) {
  const fieldId = useId();
  const [payload, setPayload] = useState("");
  const [state, setState] = useState<"idle" | "copied" | "imported" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [state]);

  const copySession = async () => {
    try {
      const session = await getActiveReviewSession();
      const nextPayload = JSON.stringify(session, null, 2);
      setPayload(nextPayload);
      await navigator.clipboard.writeText(nextPayload);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  const importSession = async () => {
    try {
      const session = JSON.parse(payload) as ReviewSession;
      await onImport(session);
      setState("imported");
    } catch {
      setState("failed");
    }
  };

  return (
    <>
      <div
        className={`session-handoff-panel__overlay ${isOpen ? "session-handoff-panel__overlay--visible" : ""}`}
        onClick={onClose}
      />
      <aside
        aria-hidden={!isOpen}
        aria-label="Session handoff"
        className={`session-handoff-panel ${isOpen ? "session-handoff-panel--open" : ""}`}
      >
        <header className="session-handoff-panel__header">
          <div>
            <p className="session-handoff-panel__eyebrow">Session</p>
            <h2 className="session-handoff-panel__title">Resume pack</h2>
          </div>
          <Button aria-label="Close session panel" onClick={onClose}>
            Close
          </Button>
        </header>

        <p className="session-handoff-panel__text">
          Copy this pack to resume the same DiffDeck review later. Paste a pack here to restore the review and let
          DiffDeck format it back into cards.
        </p>

        <label className="session-handoff-panel__label" htmlFor={fieldId}>
          DiffDeck session pack
        </label>
        <textarea
          className="session-handoff-panel__textarea"
          id={fieldId}
          onChange={(event) => setPayload(event.target.value)}
          placeholder="Paste a diffdeck.session.v1 payload here."
          spellCheck={false}
          value={payload}
        />

        <footer className="session-handoff-panel__footer">
          <div className="session-handoff-panel__state" aria-live="polite">
            {state === "copied" ? "Copied" : null}
            {state === "imported" ? "Imported" : null}
            {state === "failed" ? "Invalid or unavailable" : null}
          </div>
          <div className="session-handoff-panel__actions">
            <Button onClick={() => void copySession()}>Copy current</Button>
            <Button disabled={!payload.trim()} onClick={() => void importSession()} variant="primary">
              Restore
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}
