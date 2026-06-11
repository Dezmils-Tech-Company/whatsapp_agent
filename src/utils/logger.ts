import winston from "winston";
import { existsSync, mkdirSync } from "fs";

const logDir = "./logs";
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

interface BotLogger extends winston.Logger {
  action(message: string): void;
}

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    action: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    error: "red",
    warn: "yellow",
    action: "magenta",
    info: "green",
    debug: "blue",
  },
};

winston.addColors(customLevels.colors);

export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new winston.transports.Console({ level: "debug" }),
    new winston.transports.File({ filename: `${logDir}/bot.log`, level: "info", maxsize: 5_242_880, maxFiles: 5 }),
  ],
}) as BotLogger;

logger.action = (message: string) => logger.log("action", message);
