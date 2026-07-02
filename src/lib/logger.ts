type LogLevel = "debug" | "info" | "warn" | "error";

const currentLevel: LogLevel =
  process.env.NODE_ENV === "production" ? "warn" : "debug";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function prefix(level: LogLevel): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => {
    if (shouldLog("debug")) console.debug(prefix("debug"), msg, ...args);
  },
  info: (msg: string, ...args: unknown[]) => {
    if (shouldLog("info")) console.log(prefix("info"), msg, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (shouldLog("warn")) console.warn(prefix("warn"), msg, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    if (shouldLog("error")) console.error(prefix("error"), msg, ...args);
  },
};
