type LogLevel = "silent" | "error" | "info" | "debug";

const logLevelWeights: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  info: 2,
  debug: 3,
};

const configuredLogLevel = parseLogLevel(process.env.DIFFDECK_LOG_LEVEL);

function parseLogLevel(value: string | undefined): LogLevel {
  if (value === "silent" || value === "error" || value === "info" || value === "debug") {
    return value;
  }

  return "info";
}

function shouldLog(level: Exclude<LogLevel, "silent">): boolean {
  return logLevelWeights[configuredLogLevel] >= logLevelWeights[level];
}

export const logger = {
  error(message: string, details: Record<string, unknown> = {}) {
    if (shouldLog("error")) {
      console.error(message, details);
    }
  },
  info(message: string, details: Record<string, unknown> = {}) {
    if (shouldLog("info")) {
      console.info(message, details);
    }
  },
  debug(message: string, details: Record<string, unknown> = {}) {
    if (shouldLog("debug")) {
      console.debug(message, details);
    }
  },
};
