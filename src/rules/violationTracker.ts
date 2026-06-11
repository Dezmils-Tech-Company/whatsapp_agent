import type { Database } from "../db/database.js";
import { logger } from "../utils/logger.js";

const RESET_WINDOW_MS = 24 * 60 * 60 * 1000;

export class ViolationTracker {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async registerViolation(jid: string, reason: string) {
    const now = Date.now();
    const existing = await this.db.getViolation(jid);
    let count = 1;

    if (existing && now - existing.last_seen < RESET_WINDOW_MS) {
      count = existing.count + 1;
    }

    await this.db.upsertViolation(jid, count, now, reason);

    if (count === 1) {
      logger.warn(`Warning for ${jid}: ${reason}`);
      return { action: "warn", count };
    }

    if (count === 2) {
      logger.warn(`Mute for ${jid}: ${reason}`);
      return { action: "mute", count };
    }

    logger.action(`Block for ${jid}: ${reason}`);
    return { action: "block", count };
  }

  async isMuted(jid: string) {
    const existing = await this.db.getViolation(jid);
    if (!existing) {
      return false;
    }

    return Date.now() - existing.last_seen < RESET_WINDOW_MS && existing.count === 2;
  }
}
