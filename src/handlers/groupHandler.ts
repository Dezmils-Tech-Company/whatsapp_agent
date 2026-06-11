import type { WASocket, proto } from "baileys";
import { logger } from "../utils/logger.js";
import { groupRules } from "../rules/groupRules.js";
import type { Database } from "../db/database.js";
import type { ViolationTracker } from "../rules/violationTracker.js";
import { extractMessageText } from "../utils/messageHelpers.js";

const urlPattern = /https?:\/\/[\w\-_.~:/?#[\]@!$&'()*+,;=%]+/gi;

function findUrls(text: string) {
  return text.match(urlPattern) ?? [];
}

function getHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function handleGroupMessage(socket: WASocket, message: proto.IWebMessageInfo, tracker: ViolationTracker, db: Database) {
  const groupId = message.key?.remoteJid ?? "";
  const participant = message.key?.participant ?? "";
  const text = extractMessageText(message.message ?? undefined) ?? "";
  if (!groupId || !participant || !text.trim()) {
    return;
  }

  const forbiddenUrls = findUrls(text).filter((link) => {
    const host = getHost(link);
    return host && !groupRules.allowedDomains.some((domain) => host.endsWith(domain));
  });

  if (forbiddenUrls.length > 0) {
    const messageId = message.key?.id;
    await socket.sendMessage(groupId, { text: `Link sharing is restricted in this group. Please only share approved URLs.` });
    if (messageId) {
      await socket.sendMessage(groupId, { delete: { remoteJid: groupId, fromMe: false, id: messageId } });
    }
    const violation = await tracker.registerViolation(participant, "Unauthorized link in group");
    if (violation.action === "mute" || violation.action === "block") {
      await removeParticipant(socket, groupId, participant, violation.action === "block");
    }
    return;
  }

  const lowerText = text.toLowerCase();
  if (groupRules.prohibitedWords.some((word) => lowerText.includes(word))) {
    const messageId = message.key?.id;
    await socket.sendMessage(groupId, { text: `A prohibited word was used and the message was removed.` });
    if (messageId) {
      await socket.sendMessage(groupId, { delete: { remoteJid: groupId, fromMe: false, id: messageId } });
    }
    await removeParticipant(socket, groupId, participant, false);
    await tracker.registerViolation(participant, "Prohibited word in group");
    return;
  }

  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length > 8) {
    const upperCount = letters.replace(/[^A-Z]/g, "").length;
    if (upperCount / letters.length >= 0.85) {
      await socket.sendMessage(groupId, { text: `Please avoid using all caps in the group.` });
      const violation = await tracker.registerViolation(participant, "Excessive caps in group");
      if (violation.action === "mute" || violation.action === "block") {
        await removeParticipant(socket, groupId, participant, violation.action === "block");
      }
      return;
    }
  }

  const sameMessage = message.message?.conversation && message.message.conversation === message.message?.conversation;
  if (sameMessage) {
    const violation = await tracker.registerViolation(participant, "Repeated group message");
    if (violation.action !== "warn") {
      await removeParticipant(socket, groupId, participant, violation.action === "block");
    }
  }
}

async function removeParticipant(socket: WASocket, groupId: string, participant: string, immediateRemove: boolean) {
  if (!groupRules.adminImmunity) {
    await socket.groupParticipantsUpdate(groupId, [participant], "remove");
    logger.action(`Removed ${participant} from ${groupId} for repeated violations.`);
    return;
  }

  try {
    const metadata = await socket.groupMetadata(groupId);
    const isAdmin = metadata.participants?.some((p: any) => p.id === participant && !!p.admin);
    if (isAdmin) {
      logger.info(`Skipped removal for admin ${participant} in group ${groupId}.`);
      return;
    }
  } catch (error) {
    logger.warn("Unable to verify group admin status.", error as Error);
  }

  if (immediateRemove || groupRules.warnBeforeRemove) {
    await socket.groupParticipantsUpdate(groupId, [participant], "remove");
    logger.action(`Removed ${participant} from ${groupId} after warnings.`);
  }
}
