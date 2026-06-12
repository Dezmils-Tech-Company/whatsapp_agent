import type { WASocket } from "baileys";
import { logger } from "../utils/logger.js";
import { handleDirectMessage } from "./dmHandler.js";
import { handleGroupMessage } from "./groupHandler.js";
import type { Database } from "../db/database.js";
import type { ViolationTracker } from "../rules/violationTracker.js";

export async function handleIncomingMessages(socket: WASocket, upsert: any, tracker: ViolationTracker, db: Database, businessId: string) {
  const messages = Array.isArray(upsert?.messages) ? upsert.messages : [];

  for (const msg of messages) {
    try {
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || msg.key.fromMe || !msg.message) {
        continue;
      }

      const participant = msg.key.participant ?? remoteJid;
      const messageId = msg.key.id ?? "";

      if (remoteJid.endsWith("@g.us")) {
        // For groups we keep previous behavior: mark as read then handle
        await socket.sendReceipt(remoteJid, participant, [messageId], "read");
        await handleGroupMessage(socket, msg, tracker, db);
      } else {
        // For direct messages, only mark read when the bot actually responds.
        const state = await db.getConversationState(remoteJid);

        // If user has free chat enabled, do NOT mark incoming messages read.
        if (state?.allowDirectChat) {
          await handleDirectMessage(socket, msg, tracker, db, businessId);
        } else {
          const responded = await handleDirectMessage(socket, msg, tracker, db, businessId);
          if (responded) {
            await socket.sendReceipt(remoteJid, participant, [messageId], "read");
          }
        }
      }
    } catch (error) {
      logger.error("Failed to handle incoming message.", error as Error);
    }
  }
}
