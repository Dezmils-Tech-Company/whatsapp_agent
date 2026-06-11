import type { WASocket } from "baileys";
import { logger } from "../utils/logger.js";
import { handleDirectMessage } from "./dmHandler.js";
import { handleGroupMessage } from "./groupHandler.js";
import type { Database } from "../db/database.js";
import type { ViolationTracker } from "../rules/violationTracker.js";

export async function handleIncomingMessages(socket: WASocket, upsert: any, tracker: ViolationTracker, db: Database) {
  const messages = Array.isArray(upsert?.messages) ? upsert.messages : [];

  for (const msg of messages) {
    try {
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || msg.key.fromMe || !msg.message) {
        continue;
      }

      const participant = msg.key.participant ?? remoteJid;
      const messageId = msg.key.id ?? "";
      await socket.sendReceipt(remoteJid, participant, [messageId], "read");

      if (remoteJid.endsWith("@g.us")) {
        await handleGroupMessage(socket, msg, tracker, db);
      } else {
        await handleDirectMessage(socket, msg, tracker, db);
      }
    } catch (error) {
      logger.error("Failed to handle incoming message.", error as Error);
    }
  }
}
