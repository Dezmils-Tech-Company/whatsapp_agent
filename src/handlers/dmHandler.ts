import type { WASocket, proto } from "baileys";
import { logger } from "../utils/logger.js";
import { getAutoReply } from "../rules/autoReply.js";
import { dmRules } from "../rules/dmRules.js";
import type { Database } from "../db/database.js";
import type { ViolationTracker } from "../rules/violationTracker.js";
import { extractMessageText } from "../utils/messageHelpers.js";
import { config } from "../config.js";

const signature = " — Ezra's bot in action";

function shouldBlockText(text: string) {
  const lower = text.toLowerCase();
  return dmRules.immediateBlockKeywords.some((keyword) => lower.includes(keyword));
}

function shouldWarnText(text: string) {
  const lower = text.toLowerCase();
  if (dmRules.warningKeywords.some((keyword) => lower.includes(keyword))) {
    return true;
  }

  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 8) {
    const upperCount = letters.replace(/[^A-Z]/g, "").length;
    return upperCount / letters.length > 0.75;
  }

  return false;
}

export async function handleDirectMessage(socket: WASocket, message: proto.IWebMessageInfo, tracker: ViolationTracker, db: Database) {
  const jid = message.key?.remoteJid ?? "";
  const text = extractMessageText(message.message ?? undefined) ?? "";
  if (!text.trim()) {
    return;
  }

  if (await db.isBlocked(jid)) {
    logger.info(`Ignored message from blocked user ${jid}.`);
    return;
  }

  const autoReply = getAutoReply(text, jid, dmRules.autoReplies as any, config.quietWindowStart, config.quietWindowEnd, config.replyCooldownSeconds);
  if (autoReply) {
    await socket.sendMessage(jid, { text: `${autoReply}${signature}` });
  }

  if (shouldBlockText(text)) {
    await db.blockUser(jid, "Immediate block keyword detected");
    await socket.sendMessage(jid, { text: "Your message violated the policy and you have been blocked." });
    return;
  }

  if (shouldWarnText(text)) {
    const violation = await tracker.registerViolation(jid, "Prohibited language or caps");
    if (violation.action === "warn") {
      await socket.sendMessage(jid, { text: "Please avoid abusive language or excessive capitalization." });
    } else if (violation.action === "mute") {
      await socket.sendMessage(jid, { text: "You have been muted for 24 hours for repeated violations." });
    } else if (violation.action === "block") {
      await db.blockUser(jid, "Repeated DM violations");
      await socket.sendMessage(jid, { text: "You have been blocked for repeated policy violations." });
    }
  }
}
