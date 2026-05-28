import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DiffDeckClient } from "./diffdeck-client.js";

const client = new DiffDeckClient();

const server = new McpServer({
  name: "diffdeck",
  version: "0.1.0",
});

server.tool(
  "create_review",
  "Create a new DiffDeck review and make it the active review.",
  {
    title: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    repositoryPath: z.string().optional(),
  },
  async (input) => {
    const review = await client.createReview(input);
    return {
      content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
    };
  },
);

server.tool(
  "add_finding",
  "Add a structured draft finding to the active DiffDeck review.",
  {
    title: z.string(),
    severity: z.enum(["critical", "important", "suggestion", "question", "praise"]),
    filePath: z.string(),
    line: z.number().int().positive().optional(),
    endLine: z.number().int().positive().optional(),
    platformUrl: z.string().url().optional(),
    codeSnippet: z.string().optional(),
    explanation: z.string(),
    suggestion: z.string().optional(),
    relationToChange: z.enum(["introduced", "new_surface", "worsened", "preexisting_context"]).optional(),
    confidence: z.enum(["low", "medium", "high"]).optional(),
    agentName: z.string().optional(),
  },
  async (input) => {
    const finding = await client.addFinding({
      title: input.title,
      severity: input.severity,
      location: {
        filePath: input.filePath,
        line: input.line,
        endLine: input.endLine,
        platformUrl: input.platformUrl,
      },
      codeSnippet: input.codeSnippet,
      explanation: input.explanation,
      suggestion: input.suggestion,
      relationToChange: input.relationToChange,
      confidence: input.confidence,
      agentName: input.agentName,
    });

    return {
      content: [{ type: "text", text: JSON.stringify(finding, null, 2) }],
    };
  },
);

server.tool(
  "set_review_context",
  "Set a concise functional or ticket context summary for the active DiffDeck review.",
  {
    contextSummary: z.string().min(1),
  },
  async (input) => {
    const review = await client.updateReviewContext({ contextSummary: input.contextSummary });
    return {
      content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
    };
  },
);

server.tool(
  "list_findings",
  "List findings currently stored in the active DiffDeck review.",
  {},
  async () => {
    const findings = await client.listFindings();
    return {
      content: [{ type: "text", text: JSON.stringify(findings, null, 2) }],
    };
  },
);

server.tool(
  "list_approved_findings",
  "List human-approved DiffDeck findings that are ready to be prefilled in a code review platform.",
  {},
  async () => {
    const findings = await client.listApprovedFindings();
    return {
      content: [{ type: "text", text: JSON.stringify(findings, null, 2) }],
    };
  },
);

server.tool(
  "mark_ready_for_human_review",
  "Mark the active review as ready for human review.",
  {},
  async () => {
    const review = await client.markReadyForHumanReview();
    return {
      content: [{ type: "text", text: JSON.stringify(review, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
