import type { ReviewSnapshot } from "@diffdeck/core";
import "./ReviewSummary.scss";

type ReviewSummaryProps = {
  snapshot: ReviewSnapshot;
};

export function ReviewSummary({ snapshot }: ReviewSummaryProps) {
  return (
    <aside className="review-summary" aria-label="Review summary">
      <span className="review-summary__item">{snapshot.findings.length} findings</span>
      <span className="review-summary__item review-summary__item--status">{snapshot.review.status}</span>
    </aside>
  );
}
