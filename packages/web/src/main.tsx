import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.js";
import "./shared/styles/reset.scss";
import "./shared/styles/tokens.scss";
import "./shared/styles/globals.scss";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
