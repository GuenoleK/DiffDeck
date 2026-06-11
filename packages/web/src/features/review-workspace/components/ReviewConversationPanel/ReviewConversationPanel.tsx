import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReviewConversationMessage, ReviewSnapshot } from "@diffdeck/core";
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

const agentRevealIntervalMs = 42;
const bottomStickThresholdPx = 96;

function getNextRevealIndex(body: string, currentIndex: number): number {
  if (currentIndex >= body.length) {
    return body.length;
  }

  const minNextIndex = Math.min(body.length, currentIndex + 6);
  const maxNextIndex = Math.min(body.length, currentIndex + 18);

  if (minNextIndex >= body.length) {
    return body.length;
  }

  const nextBreakIndex = body.slice(minNextIndex, maxNextIndex).search(/[\s,.;:!?)]/);
  return nextBreakIndex >= 0 ? minNextIndex + nextBreakIndex + 1 : maxNextIndex;
}

function getAgentBody(message: ReviewConversationMessage, revealedAgentBodies: Record<string, string>): string {
  return message.role === "agent" ? (revealedAgentBodies[message.id] ?? message.body) : message.body;
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
  const messagesRef = useRef<HTMLDivElement>(null);
  const hasInitializedConversationRef = useRef(false);
  const lastConversationLengthRef = useRef(snapshot.conversation.length);
  const hasUserDetachedFromBottomRef = useRef(false);
  const shouldStickToBottomRef = useRef(true);
  const touchStartYRef = useRef<number | undefined>(undefined);
  const [body, setBody] = useState("");
  const [isReviewAttached, setIsReviewAttached] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [state, setState] = useState<"idle" | "sent" | "failed" | "copied">("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [revealedAgentBodies, setRevealedAgentBodies] = useState<Record<string, string>>({});
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

  const scrollMessagesToBottom = (behavior: ScrollBehavior = "smooth", options?: { force?: boolean }) => {
    if (hasUserDetachedFromBottomRef.current && !options?.force) {
      return;
    }

    window.requestAnimationFrame(() => {
      const messages = messagesRef.current;

      if (!messages) {
        return;
      }

      messages.scrollTo({
        behavior,
        top: messages.scrollHeight,
      });
    });
  };

  const detachMessagesFromBottom = () => {
    hasUserDetachedFromBottomRef.current = true;
    shouldStickToBottomRef.current = false;
  };

  const updateMessageStickiness = () => {
    const messages = messagesRef.current;

    if (!messages) {
      return;
    }

    const isNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < bottomStickThresholdPx;
    shouldStickToBottomRef.current = isNearBottom;

    if (isNearBottom) {
      hasUserDetachedFromBottomRef.current = false;
    } else {
      hasUserDetachedFromBottomRef.current = true;
    }
  };

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

  useEffect(() => {
    setRevealedAgentBodies((currentBodies) => {
      const shouldStreamNewMessages = hasInitializedConversationRef.current;
      const nextBodies: Record<string, string> = {};

      for (const message of snapshot.conversation) {
        if (message.role !== "agent") {
          continue;
        }

        const currentBody = currentBodies[message.id];

        if (currentBody === undefined) {
          nextBodies[message.id] = shouldStreamNewMessages ? "" : message.body;
          continue;
        }

        nextBodies[message.id] = message.body.startsWith(currentBody) ? currentBody : message.body;
      }

      return nextBodies;
    });
    hasInitializedConversationRef.current = true;
  }, [snapshot.conversation]);

  useEffect(() => {
    const hasStreamingAgentMessage = snapshot.conversation.some(
      (message) => message.role === "agent" && (revealedAgentBodies[message.id] ?? message.body).length < message.body.length,
    );

    if (!hasStreamingAgentMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRevealedAgentBodies((currentBodies) => {
        const nextBodies = { ...currentBodies };

        for (const message of snapshot.conversation) {
          if (message.role !== "agent") {
            continue;
          }

          const currentBody = currentBodies[message.id] ?? "";

          if (currentBody.length >= message.body.length) {
            continue;
          }

          nextBodies[message.id] = message.body.slice(0, getNextRevealIndex(message.body, currentBody.length));
        }

        return nextBodies;
      });
    }, agentRevealIntervalMs);

    return () => window.clearTimeout(timeoutId);
  }, [revealedAgentBodies, snapshot.conversation]);

  useEffect(() => {
    const conversationLength = snapshot.conversation.length;
    const newMessages = snapshot.conversation.slice(lastConversationLengthRef.current);
    const hasNewHumanMessage = newMessages.some((message) => message.role === "human");
    const hasNewAgentMessage = newMessages.some((message) => message.role === "agent");

    if (hasNewHumanMessage) {
      hasUserDetachedFromBottomRef.current = false;
      shouldStickToBottomRef.current = true;
      scrollMessagesToBottom("smooth", { force: true });
    } else if ((hasNewAgentMessage || isAwaitingAgentReply) && !hasUserDetachedFromBottomRef.current) {
      shouldStickToBottomRef.current = true;
      scrollMessagesToBottom("smooth");
    }

    lastConversationLengthRef.current = conversationLength;
  }, [isAwaitingAgentReply, snapshot.conversation.length]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollMessagesToBottom("auto");
    }
  }, [revealedAgentBodies]);

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
      hasUserDetachedFromBottomRef.current = false;
      shouldStickToBottomRef.current = true;
      scrollMessagesToBottom("smooth", { force: true });
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

      <div
        className="review-conversation-panel__messages"
        aria-live="polite"
        onScroll={updateMessageStickiness}
        onTouchMove={(event) => {
          const touch = event.touches[0];

          if (touchStartYRef.current !== undefined && touch && touch.clientY > touchStartYRef.current) {
            detachMessagesFromBottom();
          }
        }}
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0]?.clientY;
        }}
        onWheel={(event) => {
          if (event.deltaY < 0) {
            detachMessagesFromBottom();
          }
        }}
        ref={messagesRef}
      >
        {snapshot.conversation.length ? (
          <>
            {snapshot.conversation.map((message) => {
              const relatedFinding = message.relatedFindingId ? findingById.get(message.relatedFindingId) : undefined;
              const relatedFiles = message.relatedFilePaths ?? (message.relatedFilePath ? [message.relatedFilePath] : []);
              const relatedFileLabel = message.relatedLine
                ? `${message.relatedFilePath ?? relatedFiles[0]}:${message.relatedLine} (${message.relatedLineSide ?? "new"})`
                : formatFileScope(relatedFiles);
              const displayedBody = getAgentBody(message, revealedAgentBodies);
              const isAgentStreaming = message.role === "agent" && displayedBody.length < message.body.length;

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
                  <p
                    className={`review-conversation-panel__body ${
                      isAgentStreaming ? "review-conversation-panel__body--streaming" : ""
                    }`}
                  >
                    {displayedBody}
                  </p>
                </article>
              );
            })}
            {isAwaitingAgentReply ? (
              <article
                aria-label="Waiting for agent reply"
                className="review-conversation-panel__message review-conversation-panel__message--agent review-conversation-panel__message--pending-reply"
              >
                <div aria-hidden="true" className="review-conversation-panel__typing-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </article>
            ) : null}
          </>
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
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                return;
              }

              event.preventDefault();
              void ask();
            }}
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
