import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type SetupTarget = "claude-desktop" | "cursor-project" | "codex" | "custom";

type SetupOptions = {
  printOnly: boolean;
  yes: boolean;
  target?: SetupTarget;
  configPath?: string;
};

type McpConfig = {
  mcpServers?: Record<string, unknown>;
  [key: string]: unknown;
};

const moduleDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(moduleDir, "../../..");
const mcpEntryPoint = resolve(workspaceRoot, "packages/mcp/dist/index.js");
const defaultApiUrl = "http://127.0.0.1:4337/api";

export async function setupMcp(args: string[]) {
  const options = parseSetupArgs(args);
  const diffdeckConfig = buildDiffDeckMcpConfig();

  if (options.printOnly) {
    printConfig(diffdeckConfig);
    return;
  }

  const resolved = await resolveTarget(options);
  const shouldWrite = options.yes || (await confirmWrite(resolved.configPath));

  if (!shouldWrite) {
    console.log("No changes made.");
    printConfig(diffdeckConfig);
    return;
  }

  writeMcpConfig(resolved.configPath, diffdeckConfig);
  console.log(`DiffDeck MCP configuration written to ${resolved.configPath}`);
}

function parseSetupArgs(args: string[]): SetupOptions {
  const options: SetupOptions = {
    printOnly: false,
    yes: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--print") {
      options.printOnly = true;
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    } else if (arg === "--target") {
      options.target = args[index + 1] as SetupTarget;
      index += 1;
    } else if (arg === "--config") {
      options.configPath = args[index + 1];
      index += 1;
    }
  }

  if (options.configPath && !options.target) {
    options.target = "custom";
  }

  return options;
}

function buildDiffDeckMcpConfig() {
  return {
    command: "node",
    args: [mcpEntryPoint],
    env: {
      DIFFDECK_API_URL: defaultApiUrl,
    },
  };
}

async function resolveTarget(options: SetupOptions): Promise<{ configPath: string }> {
  if (options.configPath) {
    return { configPath: resolve(options.configPath) };
  }

  const target = options.target ?? (await askTarget());

  if (target === "claude-desktop") {
    return { configPath: getClaudeDesktopConfigPath() };
  }

  if (target === "cursor-project") {
    return { configPath: resolve(process.cwd(), ".cursor/mcp.json") };
  }

  if (target === "codex") {
    return { configPath: resolve(homedir(), ".codex/config.toml") };
  }

  return { configPath: resolve(await askCustomPath()) };
}

async function askTarget(): Promise<SetupTarget> {
  const rl = createInterface({ input, output });

  try {
    console.log("Where should DiffDeck add the MCP server?");
    console.log("1. Claude Desktop user config");
    console.log("2. Cursor project config (.cursor/mcp.json in the current folder)");
    console.log("3. Codex user config (~/.codex/config.toml)");
    console.log("4. Custom JSON file path");
    const answer = await rl.question("Choose 1, 2, 3, or 4: ");

    if (answer.trim() === "1") {
      return "claude-desktop";
    }

    if (answer.trim() === "2") {
      return "cursor-project";
    }

    if (answer.trim() === "3") {
      return "codex";
    }

    return "custom";
  } finally {
    rl.close();
  }
}

async function askCustomPath(): Promise<string> {
  const rl = createInterface({ input, output });

  try {
    return await rl.question("MCP JSON config path: ");
  } finally {
    rl.close();
  }
}

async function confirmWrite(configPath: string): Promise<boolean> {
  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question(`Write DiffDeck MCP config to ${configPath}? [y/N] `);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

function getClaudeDesktopConfigPath(): string {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? resolve(homedir(), "AppData/Roaming");
    return resolve(appData, "Claude/claude_desktop_config.json");
  }

  if (process.platform === "darwin") {
    return resolve(homedir(), "Library/Application Support/Claude/claude_desktop_config.json");
  }

  return resolve(homedir(), ".config/Claude/claude_desktop_config.json");
}

function writeMcpConfig(configPath: string, diffdeckConfig: unknown) {
  if (configPath.endsWith(".toml")) {
    writeCodexTomlConfig(configPath);
    return;
  }

  const existingConfig = readExistingConfig(configPath);
  const nextConfig: McpConfig = {
    ...existingConfig,
    mcpServers: {
      ...(existingConfig.mcpServers ?? {}),
      diffdeck: diffdeckConfig,
    },
  };

  mkdirSync(dirname(configPath), { recursive: true });

  if (existsSync(configPath)) {
    const backupPath = `${configPath}.bak-${Date.now()}`;
    writeFileSync(backupPath, readFileSync(configPath));
    console.log(`Backup created at ${backupPath}`);
  }

  writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
}

function writeCodexTomlConfig(configPath: string) {
  const existing = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";

  if (existing.includes("[mcp_servers.diffdeck]")) {
    console.log("DiffDeck MCP already exists in this Codex config. No changes made.");
    return;
  }

  mkdirSync(dirname(configPath), { recursive: true });

  if (existsSync(configPath)) {
    const backupPath = `${configPath}.bak-${Date.now()}`;
    writeFileSync(backupPath, readFileSync(configPath));
    console.log(`Backup created at ${backupPath}`);
  }

  const nextConfig = `${existing.trimEnd()}

[mcp_servers.diffdeck]
command = "node"
args = [${JSON.stringify(mcpEntryPoint)}]
startup_timeout_sec = 120

[mcp_servers.diffdeck.env]
DIFFDECK_API_URL = ${JSON.stringify(defaultApiUrl)}
`;

  writeFileSync(configPath, `${nextConfig.trimStart()}\n`);
}

function readExistingConfig(configPath: string): McpConfig {
  if (!existsSync(configPath)) {
    return {};
  }

  const raw = readFileSync(configPath, "utf8");
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw) as McpConfig;
}

function printConfig(diffdeckConfig: unknown) {
  console.log(
    JSON.stringify(
      {
        mcpServers: {
          diffdeck: diffdeckConfig,
        },
      },
      null,
      2,
    ),
  );
}
