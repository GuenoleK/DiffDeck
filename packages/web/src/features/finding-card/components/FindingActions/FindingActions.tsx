import type { FindingStatus } from "@diffdeck/core";
import { Button } from "../../../../shared/components/Button/Button.js";
import "./FindingActions.scss";

type FindingActionsProps = {
  isConversationTarget?: boolean;
  onAskAboutFinding: () => void;
  status: FindingStatus;
  onStatusChange: (status: FindingStatus) => Promise<void>;
};

export function FindingActions({ isConversationTarget = false, onAskAboutFinding, status, onStatusChange }: FindingActionsProps) {
  const actionClassName = (targetStatus: FindingStatus) =>
    `finding-actions__button finding-actions__button--${targetStatus} ${
      status === targetStatus ? "finding-actions__button--active" : ""
    }`.trim();

  return (
    <footer className="finding-actions">
      <span className="finding-actions__status">Status: {status}</span>
      <div className="finding-actions__buttons">
        <Button
          aria-pressed={isConversationTarget}
          className={`finding-actions__button finding-actions__button--ask ${
            isConversationTarget ? "finding-actions__button--active" : ""
          }`}
          onClick={onAskAboutFinding}
        >
          Ask AI
        </Button>
        <Button
          aria-pressed={status === "approved"}
          className={actionClassName("approved")}
          onClick={() => void onStatusChange("approved")}
          variant={status === "approved" ? "primary" : "quiet"}
        >
          Approve
        </Button>
        <Button
          aria-pressed={status === "rejected"}
          className={actionClassName("rejected")}
          onClick={() => void onStatusChange("rejected")}
        >
          Reject
        </Button>
        <Button
          aria-pressed={status === "resolved"}
          className={actionClassName("resolved")}
          onClick={() => void onStatusChange("resolved")}
        >
          Resolve
        </Button>
        <Button
          aria-pressed={status === "archived"}
          className={actionClassName("archived")}
          onClick={() => void onStatusChange("archived")}
        >
          Archive
        </Button>
      </div>
    </footer>
  );
}
