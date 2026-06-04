import type { ReviewTokenUsage, ReviewUsage, ReviewUsageConfidence } from "@diffdeck/core";
import "./ReviewUsageSummary.scss";

type ReviewUsageSummaryProps = {
  usage?: ReviewUsage;
};

type UsageRow = {
  label: string;
  usage?: ReviewTokenUsage;
  tooltip: string;
};

const confidenceLabels: Record<ReviewUsageConfidence, string> = {
  exact: "Exact",
  estimated: "Estimated",
  observed: "Observed",
  unavailable: "Unavailable",
};

const confidenceTooltips: Record<ReviewUsageConfidence, string> = {
  exact: "Exact token count reported by the AI tool or provider.",
  estimated: "Approximation derived from visible DiffDeck data, not provider billing.",
  observed: "Computed from content stored or exchanged through DiffDeck.",
  unavailable: "Not exposed by the AI tool and not visible to DiffDeck.",
};

function getTokenTotal(usage: ReviewTokenUsage | undefined): number | undefined {
  if (!usage) {
    return undefined;
  }

  if (usage.totalTokens !== undefined) {
    return usage.totalTokens;
  }

  if (usage.inputTokens !== undefined || usage.outputTokens !== undefined) {
    return (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
  }

  return undefined;
}

function formatTokens(tokens: number | undefined): string {
  if (tokens === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: tokens >= 1000 ? 1 : 0,
    notation: tokens >= 1000 ? "compact" : "standard",
  }).format(tokens);
}

function getConfidence(usage: ReviewTokenUsage | undefined): ReviewUsageConfidence {
  return usage?.confidence ?? "unavailable";
}

function UsageBadge({ confidence, tooltip }: { confidence: ReviewUsageConfidence; tooltip?: string }) {
  const tooltipText = tooltip ?? confidenceTooltips[confidence];

  return (
    <span
      aria-label={`${confidenceLabels[confidence]}: ${tooltipText}`}
      className={`review-usage-summary__badge review-usage-summary__badge--${confidence}`}
      data-tooltip={tooltipText}
      tabIndex={0}
    >
      {confidenceLabels[confidence]}
    </span>
  );
}

function UsageMetricRow({ label, tooltip, usage }: UsageRow) {
  const confidence = getConfidence(usage);

  return (
    <span className="review-usage-summary__row">
      <span className="review-usage-summary__row-label">{label}</span>
      <strong className="review-usage-summary__row-value">{formatTokens(getTokenTotal(usage))}</strong>
      <UsageBadge confidence={confidence} tooltip={usage?.note ?? tooltip} />
    </span>
  );
}

export function ReviewUsageSummary({ usage }: ReviewUsageSummaryProps) {
  const totalConfidence = getConfidence(usage?.total);
  const providerLabel = [usage?.provider, usage?.model].filter(Boolean).join(" / ");
  const rows: UsageRow[] = [
    {
      label: "DiffDeck",
      usage: usage?.diffdeck,
      tooltip: "Review context, findings, and conversation visible to DiffDeck.",
    },
    {
      label: "Project",
      usage: usage?.project,
      tooltip: "File diffs and project payloads stored in the active review.",
    },
    {
      label: "Host",
      usage: usage?.other,
      tooltip: "AI client overhead, hidden prompts, history, and unseen context.",
    },
  ];

  return (
    <aside className="review-usage-summary" aria-label="Token usage">
      <header className="review-usage-summary__header">
        <span className="review-usage-summary__eyebrow">Usage</span>
        <UsageBadge confidence={totalConfidence} tooltip={usage?.total.note} />
      </header>
      <div className="review-usage-summary__total">
        <strong className="review-usage-summary__total-value">{formatTokens(getTokenTotal(usage?.total))}</strong>
        <span className="review-usage-summary__total-label">
          {totalConfidence === "exact" ? "Provider total" : "Visible estimate"}
        </span>
      </div>
      {providerLabel ? <p className="review-usage-summary__provider">{providerLabel}</p> : null}
      <div className="review-usage-summary__rows">
        {rows.map((row) => (
          <UsageMetricRow key={row.label} {...row} />
        ))}
      </div>
    </aside>
  );
}
