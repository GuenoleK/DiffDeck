import type { FindingSeverity } from "@diffdeck/core";
import { findingSeverities } from "@diffdeck/core";
import "./SeverityFilter.scss";

type SeverityFilterProps = {
  counts: Record<FindingSeverity, number>;
  selectedSeverities: FindingSeverity[];
  onToggle: (severity: FindingSeverity) => void;
  onClear: () => void;
};

const severityLabels: Record<FindingSeverity, string> = {
  critical: "Critical",
  important: "Important",
  suggestion: "Suggestion",
  question: "Question",
  praise: "Praise",
};

export function SeverityFilter({ counts, onClear, onToggle, selectedSeverities }: SeverityFilterProps) {
  const hasSelection = selectedSeverities.length > 0;

  return (
    <div className="severity-filter" aria-label="Severity filters">
      <span className="severity-filter__label">Severity</span>
      <div className="severity-filter__options">
        {findingSeverities.map((severity) => {
          const isSelected = selectedSeverities.includes(severity);

          return (
            <button
              aria-pressed={isSelected}
              className={`severity-filter__button severity-filter__button--${severity} ${
                isSelected ? "severity-filter__button--active" : ""
              }`}
              key={severity}
              onClick={() => onToggle(severity)}
              type="button"
            >
              <span>{severityLabels[severity]}</span>
              <strong>{counts[severity]}</strong>
            </button>
          );
        })}
      </div>
      {hasSelection ? (
        <button className="severity-filter__clear" onClick={onClear} type="button">
          Clear
        </button>
      ) : null}
    </div>
  );
}
