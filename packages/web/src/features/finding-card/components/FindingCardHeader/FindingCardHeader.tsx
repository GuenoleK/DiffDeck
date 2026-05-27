import type { Finding } from "@diffdeck/core";
import "./FindingCardHeader.scss";

type FindingCardHeaderProps = {
  finding: Finding;
};

export function FindingCardHeader({ finding }: FindingCardHeaderProps) {
  const line = finding.location.line ? `:${finding.location.line}` : "";

  return (
    <header className="finding-card-header">
      <div className="finding-card-header__main">
        <span className={`finding-card-header__severity finding-card-header__severity--${finding.severity}`}>
          {finding.severity}
        </span>
        <h2 className="finding-card-header__title">{finding.title}</h2>
      </div>
      <p className="finding-card-header__location">
        {finding.location.filePath}
        {line}
      </p>
    </header>
  );
}
