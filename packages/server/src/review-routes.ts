import { Hono } from "hono";
import {
  ConversationMessageDraftSchema,
  CreateReviewSchema,
  FindingDraftSchema,
  FindingPatchSchema,
  ReviewFileDiffDraftSchema,
  ReviewPatchSchema,
  ReviewSessionSchema,
  ReviewUsageDraftSchema,
} from "@diffdeck/core";
import { logger } from "./logger.js";
import { isLocalRequestHost, isTrustedOpenUrlRequest, openUrlInDefaultBrowser, parseOpenableUrl } from "./open-url.js";
import { reviewStore } from "./review-store.memory.js";

export const reviewRoutes = new Hono();

function logConversation(level: "info" | "debug", event: string, details: Record<string, unknown> = {}) {
  logger[level](`[DiffDeck conversation] ${event}`, details);
}

reviewRoutes.get("/health", (context) => {
  return context.json({ ok: true, service: "diffdeck-server" });
});

reviewRoutes.post("/system/open-url", async (context) => {
  if (!isLocalRequestHost(context.req.header("host"))) {
    return context.json({ error: "Opening URLs is only available from the local DiffDeck server" }, 403);
  }

  if (!isTrustedOpenUrlRequest(context.req.raw.headers)) {
    return context.json({ error: "Opening URLs requires a trusted DiffDeck UI request" }, 403);
  }

  const body = await context.req.json().catch(() => ({}));
  const urlValue = typeof body.url === "string" ? body.url : "";

  try {
    const url = parseOpenableUrl(urlValue);
    await openUrlInDefaultBrowser(url);
    return context.json({ ok: true });
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "Unable to open URL" }, 400);
  }
});

reviewRoutes.get("/reviews/active", (context) => {
  return context.json(reviewStore.snapshot());
});

reviewRoutes.post("/reviews/active/reset", (context) => {
  return context.json(reviewStore.reset());
});

reviewRoutes.get("/reviews/active/session", (context) => {
  return context.json(reviewStore.exportSession());
});

reviewRoutes.post("/reviews/session", async (context) => {
  const body = await context.req.json();
  const session = ReviewSessionSchema.parse(body);
  return context.json(reviewStore.importSession(session));
});

reviewRoutes.post("/reviews", async (context) => {
  const body = await context.req.json().catch(() => ({}));
  const input = CreateReviewSchema.parse(body);
  return context.json(reviewStore.createReview(input), 201);
});

reviewRoutes.post("/reviews/active/ready", (context) => {
  return context.json(reviewStore.markReadyForHumanReview());
});

reviewRoutes.patch("/reviews/active", async (context) => {
  const body = await context.req.json();
  const patch = ReviewPatchSchema.parse(body);
  return context.json(reviewStore.updateActiveReview(patch));
});

reviewRoutes.get("/reviews/active/usage", (context) => {
  return context.json(reviewStore.getUsage() ?? null);
});

reviewRoutes.put("/reviews/active/usage", async (context) => {
  const body = await context.req.json();
  const input = ReviewUsageDraftSchema.parse(body);
  return context.json(reviewStore.setUsage(input));
});

reviewRoutes.get("/reviews/active/findings", (context) => {
  return context.json(reviewStore.listFindings());
});

reviewRoutes.get("/reviews/active/approved-findings", (context) => {
  return context.json(reviewStore.listApprovedFindings());
});

reviewRoutes.get("/reviews/active/file-diffs", (context) => {
  return context.json(reviewStore.listFileDiffs());
});

reviewRoutes.post("/reviews/active/file-diffs", async (context) => {
  const body = await context.req.json();
  const input = ReviewFileDiffDraftSchema.parse(body);
  return context.json(reviewStore.upsertFileDiff(input), 201);
});

reviewRoutes.put("/reviews/active/file-diffs", async (context) => {
  const body = await context.req.json();
  const input = ReviewFileDiffDraftSchema.array().parse(body);
  return context.json(reviewStore.replaceFileDiffs(input));
});

reviewRoutes.get("/reviews/active/conversation", (context) => {
  const messages = reviewStore.listConversationMessages();
  logConversation("debug", "list", {
    count: messages.length,
    pendingHuman: messages.at(-1)?.role === "human",
  });
  return context.json(messages);
});

reviewRoutes.get("/reviews/active/conversation/pending", (context) => {
  const messages = reviewStore.listPendingConversationMessages();
  logConversation("debug", "pending", {
    count: messages.length,
    latestId: messages.at(-1)?.id,
  });
  return context.json(messages);
});

reviewRoutes.post("/reviews/active/conversation", async (context) => {
  const body = await context.req.json();
  const input = ConversationMessageDraftSchema.parse(body);
  const message = reviewStore.addConversationMessage(input);
  logConversation("info", "add", {
    id: message.id,
    role: message.role,
    isReviewAttached: message.isReviewAttached,
    relatedFindingId: message.relatedFindingId,
    relatedMessageId: message.relatedMessageId,
    bodyLength: message.body.length,
  });
  return context.json(message, 201);
});

reviewRoutes.delete("/reviews/active/conversation", (context) => {
  const previousCount = reviewStore.listConversationMessages().length;
  const snapshot = reviewStore.clearConversation();
  logConversation("info", "clear", { previousCount });
  return context.json(snapshot);
});

reviewRoutes.post("/reviews/active/findings", async (context) => {
  const body = await context.req.json();
  const input = FindingDraftSchema.parse(body);
  return context.json(reviewStore.addFinding(input), 201);
});

reviewRoutes.patch("/findings/:findingId", async (context) => {
  const body = await context.req.json();
  const patch = FindingPatchSchema.parse(body);
  const finding = reviewStore.updateFinding(context.req.param("findingId"), patch);

  if (!finding) {
    return context.json({ error: "Finding not found" }, 404);
  }

  return context.json(finding);
});

reviewRoutes.delete("/findings/:findingId", (context) => {
  const deleted = reviewStore.deleteFinding(context.req.param("findingId"));

  if (!deleted) {
    return context.json({ error: "Finding not found" }, 404);
  }

  return context.json({ ok: true });
});
