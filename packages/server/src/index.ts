import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

export type StartServerOptions = {
  port?: number;
  hostname?: string;
};

export const startServer = (options: StartServerOptions = {}) => {
  const port = options.port ?? Number(process.env.DIFFDECK_PORT ?? 4337);
  const hostname = options.hostname ?? "127.0.0.1";
  const app = createApp();

  const server = serve({
    fetch: app.fetch,
    hostname,
    port,
  });

  console.log(`DiffDeck API listening on http://${hostname}:${port}`);
  return server;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  startServer();
}
