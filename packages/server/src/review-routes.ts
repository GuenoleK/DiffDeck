import { Hono } from "hono";
import {
  CreateReviewSchema,
  FindingDraftSchema,
  FindingPatchSchema,
  ReviewPatchSchema,
  ReviewSessionSchema,
} from "@diffdeck/core";
import { isLocalRequestHost, openUrlInDefaultBrowser, parseOpenableUrl } from "./open-url.js";
import { reviewStore } from "./review-store.memory.js";

export const reviewRoutes = new Hono();

reviewRoutes.get("/health", (context) => {
  return context.json({ ok: true, service: "diffdeck-server" });
});

reviewRoutes.post("/system/open-url", async (context) => {
  if (!isLocalRequestHost(context.req.header("host"))) {
    return context.json({ error: "Opening URLs is only available from the local DiffDeck server" }, 403);
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

reviewRoutes.get("/reviews/active/findings", (context) => {
  return context.json(reviewStore.listFindings());
});

reviewRoutes.get("/reviews/active/approved-findings", (context) => {
  return context.json(reviewStore.listApprovedFindings());
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
