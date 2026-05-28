import type { Finding } from "@diffdeck/core";
import "./FindingCardHeader.scss";

type FindingCardHeaderProps = {
  finding: Finding;
};

export function FindingCardHeader({ finding }: FindingCardHeaderProps) {
  const startLine = finding.location.line ? `:${finding.location.line}` : "";
  const endLine = finding.location.line && finding.location.endLine ? `-${finding.location.endLine}` : "";
  const metaItems = [
    finding.confidence ? `${finding.confidence} confidence` : undefined,
    finding.relationToChange?.replaceAll("_", " "),
    finding.agentName,
  ].filter((item): item is string => Boolean(item));

  return (
    <header className="finding-card-header">
      <div className="finding-card-header__topline">
        <span className={`finding-card-header__severity finding-card-header__severity--${finding.severity}`}>
          <span className="finding-card-header__severity-dot" aria-hidden="true" />
          {finding.severity}
        </span>
        <p className="finding-card-header__location">
          {finding.location.filePath}
          {startLine}
          {endLine}
        </p>
      </div>
      <h2 className="finding-card-header__title">{finding.title}</h2>
      {metaItems.length ? (
        <div className="finding-card-header__meta">
          {metaItems.map((item) => (
            <span className="finding-card-header__meta-item" key={item}>
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}
