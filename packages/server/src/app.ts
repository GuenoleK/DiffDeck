import { Hono } from "hono";
import { cors } from "hono/cors";
import { reviewRoutes } from "./review-routes.js";

export const createApp = () => {
  const app = new Hono();

  app.use(
    "/api/*",
    cors({
      origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
    }),
  );

  app.route("/api", reviewRoutes);

  return app;
};
