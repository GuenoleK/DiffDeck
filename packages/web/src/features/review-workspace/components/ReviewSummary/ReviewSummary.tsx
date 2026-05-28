import type { ReviewSnapshot } from "@diffdeck/core";
import "./ReviewSummary.scss";

type ReviewSummaryProps = {
  snapshot: ReviewSnapshot;
};

export function ReviewSummary({ snapshot }: ReviewSummaryProps) {
  const approvedCount = snapshot.findings.filter((finding) => finding.status === "approved").length;
  const draftCount = snapshot.findings.filter((finding) => finding.status === "draft").length;
  const highSignalCount = snapshot.findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "important",
  ).length;

  return (
    <aside className="review-summary" aria-label="Review summary">
      <span className="review-summary__item">
        <strong className="review-summary__value">{snapshot.findings.length}</strong>
        <span className="review-summary__label">Findings</span>
      </span>
      <span className="review-summary__item">
        <strong className="review-summary__value">{draftCount}</strong>
        <span className="review-summary__label">Draft</span>
      </span>
      <span className="review-summary__item">
        <strong className="review-summary__value">{approvedCount}</strong>
        <span className="review-summary__label">Approved</span>
      </span>
      <span className="review-summary__item review-summary__item--status">
        <strong className="review-summary__value">{highSignalCount}</strong>
        <span className="review-summary__label">High signal</span>
      </span>
    </aside>
  );
}
