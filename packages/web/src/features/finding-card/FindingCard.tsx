import type { Finding, FindingStatus } from "@diffdeck/core";
import { FindingActions } from "./components/FindingActions/FindingActions.js";
import { FindingCardHeader } from "./components/FindingCardHeader/FindingCardHeader.js";
import { FindingSnippet } from "./components/FindingSnippet/FindingSnippet.js";
import "./FindingCard.scss";

type FindingCardProps = {
  finding: Finding;
  onStatusChange: (status: FindingStatus) => Promise<void>;
};

export function FindingCard({ finding, onStatusChange }: FindingCardProps) {
  return (
    <article className={`finding-card finding-card--${finding.severity}`}>
      <FindingCardHeader finding={finding} />

      <div className="finding-card__body">
        <p className="finding-card__explanation">{finding.explanation}</p>
        {finding.codeSnippet ? <FindingSnippet code={finding.codeSnippet} /> : null}
        {finding.suggestion ? (
          <div className="finding-card__suggestion">
            <h3 className="finding-card__section-title">Suggested comment</h3>
            <p className="finding-card__suggestion-text">{finding.suggestion}</p>
          </div>
        ) : null}
      </div>

      <FindingActions status={finding.status} onStatusChange={onStatusChange} />
    </article>
  );
}
