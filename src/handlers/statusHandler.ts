import type { WASocket } from "baileys";
import { logger } from "../utils/logger.js";
import type { Database } from "../db/database.js";

const positiveKeywords = [
  "gratitude",
  "hope",
  "joy",
  "blessed",
  "peace",
  "smile",
  "resilience",
  "kindness",
  "motivate",
  "strong",
  "uplift",
  "love",
  "grateful",
  "shine",
  "dream",
];

export async function handlePresenceUpdate(socket: WASocket, update: any, db: Database) {
  const contact = update.id ?? "";
  const status = String(update.lastKnownPresence ?? "").toLowerCase();
  if (!contact || !status) {
    return;
  }

  const found = positiveKeywords.some((keyword) => status.includes(keyword));
  if (!found) {
    return;
  }

  try {
    await socket.sendMessage(contact, { text: status.includes("love") ? "❤️" : "🙏" });
    logger.info(`Reacted to status update from ${contact}.`);
  } catch (error) {
    logger.warn(`Failed to react to status update from ${contact}.`, error as Error);
  }
}
