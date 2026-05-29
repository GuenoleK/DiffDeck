import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DiffDeckClient } from "./diffdeck-client.js";

const client = new DiffDeckClient();

function logMcpConversation(event: string, details: Record<string, unknown> = {}) {
  console.error(`[DiffDeck MCP conversation] ${event}`, details);
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

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
  "reset_review",
  "Reset the active DiffDeck review by clearing all findings, context, approvals, and session state.",
  {},
  async () => {
    const snapshot = await client.resetReview();
    return {
      content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }],
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
  "list_conversation",
  "List the active DiffDeck review conversation, including human questions from the UI and agent replies.",
  {},
  async () => {
    logMcpConversation("list_conversation:start");
    try {
      const messages = await client.listConversationMessages();
      logMcpConversation("list_conversation:ok", {
        count: Array.isArray(messages) ? messages.length : undefined,
        pendingHuman: Array.isArray(messages) ? messages.at(-1)?.role === "human" : undefined,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(messages, null, 2) }],
      };
    } catch (error) {
      logMcpConversation("list_conversation:error", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
);

server.tool(
  "list_pending_conversation",
  "List human DiffDeck UI messages that do not have an agent reply yet.",
  {},
  async () => {
    logMcpConversation("list_pending_conversation:start");
    try {
      const messages = await client.listPendingConversationMessages();
      logMcpConversation("list_pending_conversation:ok", {
        count: messages.length,
        latestId: messages.at(-1)?.id,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(messages, null, 2) }],
      };
    } catch (error) {
      logMcpConversation("list_pending_conversation:error", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
);

server.tool(
  "wait_for_conversation_message",
  "Watch DiffDeck for a pending human UI message and return it when one arrives. Use this to keep an agent connected to the DiffDeck chat.",
  {
    timeoutSeconds: z.number().int().min(1).max(300).optional(),
    pollIntervalMs: z.number().int().min(250).max(10000).optional(),
  },
  async (input) => {
    const timeoutMs = (input.timeoutSeconds ?? 60) * 1000;
    const pollIntervalMs = input.pollIntervalMs ?? 1000;
    const startedAt = Date.now();

    logMcpConversation("wait_for_conversation_message:start", {
      timeoutSeconds: input.timeoutSeconds ?? 60,
      pollIntervalMs,
    });

    while (Date.now() - startedAt < timeoutMs) {
      const messages = await client.listPendingConversationMessages();
      const latestMessage = messages.at(-1);

      if (latestMessage) {
        logMcpConversation("wait_for_conversation_message:message", {
          id: latestMessage.id,
          pendingCount: messages.length,
          isReviewAttached: latestMessage.isReviewAttached,
          relatedFindingId: latestMessage.relatedFindingId,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  timedOut: false,
                  pendingCount: messages.length,
                  message: latestMessage,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      await sleep(pollIntervalMs);
    }

    logMcpConversation("wait_for_conversation_message:timeout", {
      timeoutSeconds: input.timeoutSeconds ?? 60,
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              timedOut: true,
              pendingCount: 0,
              message: null,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "add_conversation_reply",
  "Add an agent reply to the active DiffDeck review conversation so the human can read it in the UI.",
  {
    body: z.string().min(1),
    isReviewAttached: z.boolean().optional(),
    relatedMessageId: z.string().optional(),
    relatedFindingId: z.string().optional(),
    agentName: z.string().optional(),
  },
  async (input) => {
    logMcpConversation("add_conversation_reply:start", {
      isReviewAttached: input.isReviewAttached,
      relatedFindingId: input.relatedFindingId,
      relatedMessageId: input.relatedMessageId,
      bodyLength: input.body.length,
    });
    try {
      const message = await client.addConversationReply(input);
      logMcpConversation("add_conversation_reply:ok", {
        id: message.id,
        role: message.role,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(message, null, 2) }],
      };
    } catch (error) {
      logMcpConversation("add_conversation_reply:error", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
