import type { FindingStatus } from "@diffdeck/core";
import { Button } from "../../../../shared/components/Button/Button.js";
import "./FindingActions.scss";

type FindingActionsProps = {
  status: FindingStatus;
  onStatusChange: (status: FindingStatus) => Promise<void>;
};

export function FindingActions({ status, onStatusChange }: FindingActionsProps) {
  return (
    <footer className="finding-actions">
      <span className="finding-actions__status">Status: {status}</span>
      <div className="finding-actions__buttons">
        <Button variant="primary" onClick={() => void onStatusChange("approved")}>
          Approve
        </Button>
        <Button onClick={() => void onStatusChange("rejected")}>Reject</Button>
        <Button onClick={() => void onStatusChange("resolved")}>Resolve</Button>
      </div>
    </footer>
  );
}
