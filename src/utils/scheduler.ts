import cron from "node-cron";
import { readFileSync } from "fs";
import { logger } from "./logger.js";
import { config } from "../config.js";
import { Database } from "../db/database.js";

function loadQuotes(): string[] {
  const path = new URL("../../data/quotes.json", import.meta.url);
  return JSON.parse(readFileSync(path, "utf-8")) as string[];
}

function currentQuote(quotes: string[]): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = quotes.length > 0 ? dayOfYear % quotes.length : -1;
  return quotes[index] ?? "Stay positive and keep moving forward.";
}

export function startDailyQuoteScheduler(getSocket: () => any, db: Database) {
  const quotes = loadQuotes();
  const cronExpression = config.quoteCron;

  logger.info(`Scheduling daily quote at ${config.quoteTime} (${cronExpression}).`);

  cron.schedule(cronExpression, async () => {
    const socket = getSocket();
    if (!socket) {
      logger.warn("Daily quote scheduler skipped because socket is not ready.");
      return;
    }

    const quote = currentQuote(quotes);
    try {
      await socket.sendMessage("status@broadcast", { status: quote });
      const dateKey = new Date().toISOString().slice(0, 10);
      await db.logQuote(dateKey, quote);
      logger.info(`Posted daily quote to status: ${quote}`);
    } catch (error) {
      logger.error("Failed to post daily quote.", error as Error);
    }
  });
}
