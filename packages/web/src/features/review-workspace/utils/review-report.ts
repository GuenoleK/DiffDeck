import type { Finding, Review } from "@diffdeck/core";

type ReviewReportInput = {
  findings: Finding[];
  review: Review;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const escapeMarkdown = (value: string): string => value.replaceAll("`", "\\`");

const formatMarkdownText = (value: string): string =>
  value
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join("\n\n");

const formatHtmlText = (value: string): string =>
  value
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replaceAll("\n", "<br />")}</p>`)
    .join("");

const formatLocation = (finding: Finding): string => {
  const line = finding.location.line ? `:${finding.location.line}` : "";
  return `${finding.location.filePath}${line}`;
};

const getComment = (finding: Finding): string => finding.suggestion?.trim() || finding.explanation;

export const createMarkdownReport = ({ findings, review }: ReviewReportInput): string => {
  const lines = [`# ${review.title}`, "", `Approved comments: ${findings.length}`, ""];

  if (review.contextSummary?.trim()) {
    lines.push("## Context", "", review.contextSummary.trim(), "");
  }

  lines.push("## Comments", "");

  findings.forEach((finding, index) => {
    lines.push(
      `### ${index + 1}. [${finding.severity}] ${finding.title}`,
      "",
      `\`${escapeMarkdown(formatLocation(finding))}\``,
      "",
      formatMarkdownText(getComment(finding)),
      "",
    );
  });

  return lines.join("\n").trimEnd();
};

export const createHtmlReport = ({ findings, review }: ReviewReportInput): string => {
  const context = review.contextSummary?.trim();
  const findingSections = findings
    .map((finding, index) => {
      const location = formatLocation(finding);
      return `
        <article class="finding finding--${escapeHtml(finding.severity)}">
          <header class="finding__header">
            <span class="finding__severity">${escapeHtml(finding.severity)}</span>
            <h2>${index + 1}. ${escapeHtml(finding.title)}</h2>
          </header>
          <p class="finding__location">${escapeHtml(location)}</p>
          <section class="finding__comment">
            ${formatHtmlText(getComment(finding))}
          </section>
        </article>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(review.title)} - DiffDeck</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #090b10;
        --surface: #111620;
        --raised: #171d29;
        --border: #263142;
        --text: #edf2ff;
        --muted: #9da9bd;
        --critical: #ff5c7a;
        --important: #ffb454;
        --suggestion: #7cc7ff;
        --question: #b99cff;
        --praise: #77dca2;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font: 16px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      main {
        width: min(980px, calc(100% - 32px));
        margin: 0 auto;
        padding: 40px 0 64px;
      }

      h1 {
        margin: 0;
        font-size: 42px;
        line-height: 1.05;
      }

      h2,
      h3,
      p {
        margin-top: 0;
      }

      .summary {
        margin: 12px 0 28px;
        color: var(--muted);
      }

      .context,
      .finding {
        border: 1px solid var(--border);
        border-radius: 8px;
        background: linear-gradient(180deg, var(--raised), var(--surface));
        padding: 18px;
        margin: 16px 0;
      }

      .finding {
        border-left-width: 4px;
      }

      .finding--critical {
        border-left-color: var(--critical);
      }

      .finding--important {
        border-left-color: var(--important);
      }

      .finding--suggestion {
        border-left-color: var(--suggestion);
      }

      .finding--question {
        border-left-color: var(--question);
      }

      .finding--praise {
        border-left-color: var(--praise);
      }

      .finding__header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .finding__header h2 {
        margin: 0;
        font-size: 20px;
      }

      .finding__severity {
        border-radius: 999px;
        padding: 3px 9px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--critical);
        font-size: 12px;
        text-transform: uppercase;
      }

      .finding__location {
        margin: 12px 0 18px;
        color: #b9d5ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        overflow-wrap: anywhere;
      }

      .finding__comment {
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 14px;
        background: rgba(3, 6, 12, 0.45);
      }

      .context p,
      .finding__comment p {
        margin-bottom: 0;
      }

      .context p + p,
      .finding__comment p + p {
        margin-top: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(review.title)}</h1>
      <p class="summary">Approved comments: ${findings.length}</p>
      ${
        context
          ? `<section class="context"><h2>Context</h2>${formatHtmlText(context)}</section>`
          : ""
      }
      <section>
        <h2>Comments</h2>
        ${findingSections}
      </section>
    </main>
  </body>
</html>`;
};

export const downloadTextFile = (filename: string, content: string, type: string): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
