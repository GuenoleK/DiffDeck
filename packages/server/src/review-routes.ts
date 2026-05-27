import { Hono } from "hono";
import {
  CreateReviewSchema,
  FindingDraftSchema,
  FindingPatchSchema,
} from "@diffdeck/core";
import { reviewStore } from "./review-store.memory.js";

export const reviewRoutes = new Hono();

reviewRoutes.get("/health", (context) => {
  return context.json({ ok: true, service: "diffdeck-server" });
});

reviewRoutes.get("/reviews/active", (context) => {
  return context.json(reviewStore.snapshot());
});

reviewRoutes.post("/reviews", async (context) => {
  const body = await context.req.json().catch(() => ({}));
  const input = CreateReviewSchema.parse(body);
  return context.json(reviewStore.createReview(input), 201);
});

reviewRoutes.post("/reviews/active/ready", (context) => {
  return context.json(reviewStore.markReadyForHumanReview());
});

reviewRoutes.get("/reviews/active/findings", (context) => {
  return context.json(reviewStore.listFindings());
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
