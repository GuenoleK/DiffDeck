import { useEffect, useId, useMemo, useState } from "react";
import type { ReviewSnapshot } from "@diffdeck/core";
import { Button } from "../../../../shared/components/Button/Button.js";
import type { ReviewDiffContext } from "../../../review-diff/review-diff-context.js";
import "./ReviewConversationPanel.scss";

type ReviewConversationPanelProps = {
  onAsk: (input: { body: string; isReviewAttached: boolean; relatedFindingId?: string }) => Promise<void>;
  onClearConversation: () => Promise<void>;
  onDiffContextClear: () => void;
  onScopeChange: (findingId: string | undefined) => void;
  selectedDiffContext: ReviewDiffContext;
  selectedFindingId?: string;
  snapshot: ReviewSnapshot;
};

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatFileScope(filePaths: string[]): string {
  if (filePaths.length === 0) {
    return "Whole review";
  }

  if (filePaths.length === 1) {
    return filePaths[0];
  }

  return `${filePaths.length} files`;
}

export function ReviewConversationPanel({
  onAsk,
  onClearConversation,
  onDiffContextClear,
  onScopeChange,
  selectedDiffContext,
  selectedFindingId,
  snapshot,
}: ReviewConversationPanelProps) {
  const questionId = useId();
  const [body, setBody] = useState("");
  const [isReviewAttached, setIsReviewAttached] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [state, setState] = useState<"idle" | "sent" | "failed" | "copied">("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const findingById = useMemo(
    () => new Map(snapshot.findings.map((finding) => [finding.id, finding])),
    [snapshot.findings],
  );
  const selectedFinding = selectedFindingId ? findingById.get(selectedFindingId) : undefined;
  const selectedLine = selectedDiffContext.line;
  const hasDiffScope = selectedDiffContext.filePaths.length > 0 || Boolean(selectedLine);
  const attachmentLabel = isReviewAttached ? "Review context" : "General";
  const scopeLabel =
    selectedFinding?.title ??
    (selectedLine
      ? `${selectedLine.filePath}:${selectedLine.line} (${selectedLine.side})`
      : formatFileScope(selectedDiffContext.filePaths));
  const pendingQuestionCount = useMemo(() => {
    const answeredMessageIds = new Set(
      snapshot.conversation
        .filter((message) => message.role === "agent" && message.relatedMessageId)
        .map((message) => message.relatedMessageId),
    );

    return snapshot.conversation.filter((message) => message.role === "human" && !answeredMessageIds.has(message.id))
      .length;
  }, [snapshot.conversation]);
  const isAwaitingAgentReply = pendingQuestionCount > 0;
  const pendingQuestionLabel = `${pendingQuestionCount} pending question${pendingQuestionCount === 1 ? "" : "s"}`;
  const agentPrompt =
    "Start watching DiffDeck chat: call wait_for_conversation_message, use relatedFindingId, relatedFilePath, relatedFilePaths, relatedLine, and relatedLineSide as context when present, then answer with add_conversation_reply. Repeat until I ask you to stop.";

  useEffect(() => {
    if (selectedFindingId && !findingById.has(selectedFindingId)) {
      onScopeChange(undefined);
    }
  }, [findingById, onScopeChange, selectedFindingId]);

  useEffect(() => {
    if (selectedFindingId || hasDiffScope) {
      setIsReviewAttached(true);
    }
  }, [hasDiffScope, selectedFindingId]);

  useEffect(() => {
    if (state === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setState("idle"), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [state]);

  const ask = async () => {
    const question = body.trim();
    if (!question) {
      return;
    }

    setIsSending(true);
    setErrorMessage(undefined);
    try {
      await onAsk({
        body: question,
        isReviewAttached,
        relatedFindingId: isReviewAttached ? selectedFindingId : undefined,
      });
      setBody("");
      setState("sent");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown send error");
      setState("failed");
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = async () => {
    if (!snapshot.conversation.length || isClearing) {
      return;
    }

    setIsClearing(true);
    setErrorMessage(undefined);
    try {
      await onClearConversation();
      setState("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown clear error");
      setState("failed");
    } finally {
      setIsClearing(false);
    }
  };

  const copyAgentPrompt = async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt);
      setErrorMessage(undefined);
      setState("copied");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to copy prompt");
      setState("failed");
    }
  };

  if (isMinimized) {
    return (
      <aside aria-label="AI conversation collapsed" className="review-conversation-panel review-conversation-panel--minimized">
        <button
          className="review-conversation-panel__restore"
          onClick={() => setIsMinimized(false)}
          type="button"
        >
          <span className="review-conversation-panel__restore-title">AI</span>
          <span className="review-conversation-panel__restore-count">{snapshot.conversation.length}</span>
        </button>
      </aside>
    );
  }

  return (
    <section aria-label="Review conversation" className="review-conversation-panel">
      <header className="review-conversation-panel__header">
        <div>
          <p className="review-conversation-panel__eyebrow">Ask AI</p>
          <h2 className="review-conversation-panel__title">
            {isReviewAttached ? "Using this review" : "General conversation"}
          </h2>
        </div>
        <div className="review-conversation-panel__signals" aria-label="Conversation state">
          <span className="review-conversation-panel__signal review-conversation-panel__signal--live">
            {attachmentLabel}
          </span>
          <span className="review-conversation-panel__signal">{snapshot.conversation.length} messages</span>
          {isAwaitingAgentReply ? (
            <span className="review-conversation-panel__signal review-conversation-panel__signal--pending">
              {pendingQuestionLabel}
            </span>
          ) : null}
          <button
            className="review-conversation-panel__clear-chat"
            disabled={!snapshot.conversation.length || isClearing}
            onClick={() => void clearChat()}
            type="button"
          >
            {isClearing ? "Clearing" : "Clear chat"}
          </button>
          <button
            className="review-conversation-panel__minimize"
            onClick={() => setIsMinimized(true)}
            type="button"
          >
            Reduce
          </button>
        </div>
      </header>

      <div className="review-conversation-panel__messages" aria-live="polite">
        {snapshot.conversation.length ? (
          snapshot.conversation.map((message) => {
            const relatedFinding = message.relatedFindingId ? findingById.get(message.relatedFindingId) : undefined;
            const relatedFiles = message.relatedFilePaths ?? (message.relatedFilePath ? [message.relatedFilePath] : []);
            const relatedFileLabel = message.relatedLine
              ? `${message.relatedFilePath ?? relatedFiles[0]}:${message.relatedLine} (${message.relatedLineSide ?? "new"})`
              : formatFileScope(relatedFiles);

            return (
              <article
                className={`review-conversation-panel__message review-conversation-panel__message--${message.role}`}
                key={message.id}
              >
                <header className="review-conversation-panel__message-header">
                  <span className="review-conversation-panel__speaker">
                    {message.role === "human" ? "You" : message.agentName ?? "Agent"}
                  </span>
                  <time className="review-conversation-panel__time" dateTime={message.createdAt}>
                    {formatMessageTime(message.createdAt)}
                  </time>
                </header>
                <div className="review-conversation-panel__message-meta">
                  <span>{message.isReviewAttached ? "Attached" : "Free chat"}</span>
                  {relatedFinding ? <span>{relatedFinding.title}</span> : null}
                  {!relatedFinding && relatedFiles.length ? <span>{relatedFileLabel}</span> : null}
                </div>
                <p className="review-conversation-panel__body">{message.body}</p>
              </article>
            );
          })
        ) : (
          <div className="review-conversation-panel__empty">
            <p className="review-conversation-panel__empty-title">No conversation yet</p>
            <p className="review-conversation-panel__empty-text">
              Use Ask AI on a finding, or ask about the whole review.
            </p>
          </div>
        )}
      </div>

      <form
        className="review-conversation-panel__composer"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <div className="review-conversation-panel__topline">
          <div className="review-conversation-panel__mode" aria-label="Message mode">
            <button
              aria-pressed={isReviewAttached}
              className={`review-conversation-panel__mode-button ${
                isReviewAttached ? "review-conversation-panel__mode-button--active" : ""
              }`}
              onClick={() => setIsReviewAttached(true)}
              type="button"
            >
              Review context
            </button>
            <button
              aria-pressed={!isReviewAttached}
              className={`review-conversation-panel__mode-button ${
                !isReviewAttached ? "review-conversation-panel__mode-button--active" : ""
              }`}
              onClick={() => {
                setIsReviewAttached(false);
              }}
              type="button"
            >
              General
            </button>
          </div>

          {isReviewAttached ? (
            <div className="review-conversation-panel__scope-control">
              <span>Scope</span>
              <div className="review-conversation-panel__scope-pill">
                <span title={scopeLabel}>{scopeLabel}</span>
                {selectedFinding || hasDiffScope ? (
                  <button
                    onClick={() => {
                      onScopeChange(undefined);
                      onDiffContextClear();
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="review-conversation-panel__free-scope">No review attached</span>
          )}
        </div>

        <label className="review-conversation-panel__input-shell" htmlFor={questionId}>
          <textarea
            className="review-conversation-panel__textarea"
            id={questionId}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Ask about the review, a finding, or the next decision..."
            rows={3}
            value={body}
          />
        </label>

        <footer className="review-conversation-panel__footer">
          <div className="review-conversation-panel__state" aria-live="polite">
            {state === "sent" ? "Message saved. Waiting for a connected MCP agent." : null}
            {state === "copied" ? "Agent prompt copied" : null}
            {state === "failed" ? `Conversation error: ${errorMessage ?? "unknown error"}` : null}
            {state === "idle" && isAwaitingAgentReply
              ? `${pendingQuestionLabel} still waiting for an agent reply.`
              : null}
          </div>
          {isAwaitingAgentReply ? (
            <button className="review-conversation-panel__agent-prompt" onClick={() => void copyAgentPrompt()} type="button">
              Copy agent prompt
            </button>
          ) : null}
          <Button disabled={!body.trim() || isSending} type="submit" variant="primary">
            {isSending ? "Sending" : "Send"}
          </Button>
        </footer>
      </form>
    </section>
  );
}
