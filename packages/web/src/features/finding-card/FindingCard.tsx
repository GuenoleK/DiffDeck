import { useEffect, useRef, useState } from "react";
import type { Finding, FindingPatchInput, FindingStatus } from "@diffdeck/core";
import { EditableFindingComment } from "./components/EditableFindingComment/EditableFindingComment.js";
import { FindingActions } from "./components/FindingActions/FindingActions.js";
import { FindingCardHeader } from "./components/FindingCardHeader/FindingCardHeader.js";
import { FindingSnippet } from "./components/FindingSnippet/FindingSnippet.js";
import "./FindingCard.scss";

type FindingCardProps = {
  finding: Finding;
  isConversationTarget?: boolean;
  onAskAboutFinding: (finding: Finding) => void;
  onFindingChange: (patch: FindingPatchInput) => Promise<void>;
};

export function FindingCard({ finding, isConversationTarget = false, onAskAboutFinding, onFindingChange }: FindingCardProps) {
  const serverComment = finding.suggestion ?? finding.explanation;
  const [comment, setComment] = useState(serverComment);
  const [savedComment, setSavedComment] = useState(serverComment);
  const savedCommentRef = useRef(serverComment);
  const findingIdRef = useRef(finding.id);
  const isDirty = comment !== savedComment;

  useEffect(() => {
    const previousFindingId = findingIdRef.current;
    const previousSavedComment = savedCommentRef.current;

    findingIdRef.current = finding.id;
    savedCommentRef.current = serverComment;
    setSavedComment(serverComment);
    setComment((currentComment) => {
      if (previousFindingId !== finding.id || currentComment === previousSavedComment) {
        return serverComment;
      }

      return currentComment;
    });
  }, [finding.id, serverComment]);

  const saveComment = async () => {
    await onFindingChange({ suggestion: comment });
    savedCommentRef.current = comment;
    setSavedComment(comment);
  };

  const changeStatus = async (status: FindingStatus) => {
    const nextStatus = finding.status === status ? "draft" : status;
    await onFindingChange({ status: nextStatus, suggestion: comment });
    savedCommentRef.current = comment;
    setSavedComment(comment);
  };

  return (
    <article className={`finding-card finding-card--${finding.severity} finding-card--status-${finding.status}`}>
      <FindingCardHeader finding={finding} />

      <div className="finding-card__body">
        <p className="finding-card__explanation">{finding.explanation}</p>
        {finding.codeSnippet ? <FindingSnippet code={finding.codeSnippet} /> : null}
        <EditableFindingComment isDirty={isDirty} value={comment} onChange={setComment} onSave={saveComment} />
      </div>

      <FindingActions
        isConversationTarget={isConversationTarget}
        onAskAboutFinding={() => onAskAboutFinding(finding)}
        status={finding.status}
        onStatusChange={changeStatus}
      />
    </article>
  );
}
