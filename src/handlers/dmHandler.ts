import type { WASocket, proto } from "baileys";
import { logger } from "../utils/logger.js";
import type { Database } from "../db/database.js";
import type { ViolationTracker } from "../rules/violationTracker.js";
import { extractMessageText } from "../utils/messageHelpers.js";
import {
  formatMenuMessage,
  getNextMenu,
  conversationMenus,
} from "../rules/conversationMenu.js";
import { BusinessService } from "../services/businessService.js";
import { getAutoReply } from "../rules/autoReply.js";
import { dmRules } from "../rules/dmRules.js";
import { config } from "../config.js";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(text: string, keyword: string) {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase().trim();
  if (!normalizedKeyword) return false;

  const regex = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, "i");
  if (regex.test(normalizedText)) {
    return true;
  }

  return normalizedText
    .split(/[.!?\n]/)
    .some((sentence) => sentence.trim().includes(normalizedKeyword));
}

function formatIntroMessage(businessName?: string) {
  const name = businessName || "Dezmils Tech Company";
  return (
    `  This is an automated business agent. For a normal live chat, reply with "5" to continue and connect to a human.`
  );
}

export async function handleDirectMessage(
  socket: WASocket,
  message: proto.IWebMessageInfo,
  _tracker: ViolationTracker,
  db: Database,
  businessId: string
): Promise<boolean> {
  const businessService = new BusinessService(db);
  const jid = message.key?.remoteJid ?? "";
  const text = extractMessageText(message.message ?? undefined) ?? "";

  let responded = false;

  if (!text.trim()) return false;

  // ── DM RULES ENFORCEMENT ───────────────────────────────────────────────
  try {
    const lower = text.toLowerCase();

    // Immediate block keywords: block on first match
    if (Array.isArray(dmRules.immediateBlockKeywords)) {
      const matchedImmediate = dmRules.immediateBlockKeywords.find((w: string) =>
        containsKeyword(text, w)
      );
      if (matchedImmediate) {
        logger.info(`Message from ${jid} matched immediate block word "${matchedImmediate}".`);
        try {
          responded = true;
          await socket.sendMessage(jid, {
            text: `🚫 You have been blocked by this business bot because your message contained the prohibited keyword: "${matchedImmediate}".`,
          });

          if (_tracker && typeof (_tracker as any).registerViolation === "function") {
            const result = await (_tracker as any).registerViolation(jid, `immediate:${matchedImmediate}`);
            if (result?.action === "block") {
              if ((db as any).blockUser && typeof (db as any).blockUser === "function") {
                await (db as any).blockUser(jid, `Immediate rule match: ${matchedImmediate}`);
                logger.info(`Blocked user ${jid} due to immediate rule match.`);
              }
            }
          } else if ((db as any).blockUser && typeof (db as any).blockUser === "function") {
            await (db as any).blockUser(jid, `Immediate rule match: ${matchedImmediate}`);
            logger.info(`Blocked user ${jid} due to immediate rule match.`);
          }
        } catch (e) {
          logger.warn(`Failed to handle immediate rule for ${jid}: ${e}`);
        }

        return responded;
      }
    }

    // Warning keywords: register and act according to tracker
    if (Array.isArray(dmRules.warningKeywords)) {
      const matchedWarning = dmRules.warningKeywords.find((w: string) => containsKeyword(text, w));
      if (matchedWarning) {
        logger.info(`Message from ${jid} matched warning word "${matchedWarning}".`);
        try {
          if (_tracker && typeof (_tracker as any).registerViolation === "function") {
            const result = await (_tracker as any).registerViolation(jid, `warning:${matchedWarning}`);
            if (result?.action === "block") {
              if ((db as any).blockUser && typeof (db as any).blockUser === "function") {
                responded = true;
                await socket.sendMessage(jid, {
                  text: `🚫 You have been blocked by this business bot because your message contained the prohibited keyword: "${matchedWarning}".`,
                });
                await (db as any).blockUser(jid, `Violation threshold reached: ${matchedWarning}`);
                logger.info(`Blocked user ${jid} after violations.`);
              }
              return responded;
            }
            if (result?.action === "mute") {
              logger.info(`Muted user ${jid} due to repeated violations.`);
              return responded;
            }

            // For simple warnings, gently warn the user and stop processing
            responded = true;
            await socket.sendMessage(jid, { text: "⚠️ Please avoid abusive or offensive language. Continued violations may result in being blocked." });
            return responded;
          } else {
            // No tracker — warn and stop processing
            responded = true;
            await socket.sendMessage(jid, { text: "⚠️ Please avoid abusive or offensive language." });
            return responded;
          }
        } catch (e) {
          logger.warn(`Failed to handle warning rule for ${jid}: ${e}`);
        }
      }
    }
  } catch (e) {
    logger.warn(`Error while enforcing dm rules: ${e}`);
  }

  // Blocked users — ignore silently
  if (await db.isBlocked(jid)) {
    logger.info(`Ignored message from blocked user ${jid}.`);
    return responded;
  }

  // Fetch conversation state early for reuse
  let state = await db.getConversationState(jid);

  // ── CHECK FOR AUTOREPLY RULES ─────────────────────────────────────────────
  const autoReply = getAutoReply(
    text,
    jid,
    dmRules.autoReplies,
    config.quietWindowStart,
    config.quietWindowEnd,
    config.replyCooldownSeconds
  );

  if (autoReply) {
    responded = true;
    await socket.sendMessage(jid, { text: autoReply });
    logger.info(`Sent autoreply to ${jid}: "${autoReply}"`);
    // For new users, return after autoreply. For users with state, continue processing.
    if (!state) {
      return responded;
    }
  }

  const ownerJid = await businessService.getOwnerJid(businessId);

  // ── RETURNING USER WITH ACTIVE CHAT ──────────────────────────────────────
  // Once allowDirectChat is true, never show menus again. Just pass through.
  if (state?.allowDirectChat) {
    logger.info(`Free chat from ${jid}: ${text}`);
    // Forward to owner or handle elsewhere — no menu, no interference
    // Do not forward every free-chat message to the owner to avoid noise.
    return responded;
  }

  // ── BRAND NEW USER — no state at all ─────────────────────────────────────
    if (!state) {
      const menuMessage = formatMenuMessage("start");
      // Send an introductory info message before presenting the menu
      responded = true;
      await socket.sendMessage(jid, { text: formatIntroMessage(config.businessName) });
      await socket.sendMessage(jid, { text: menuMessage });
    await db.updateConversationState(jid, "start", 0, []);
    logger.info(`New user ${jid} — sent start menu.`);
    return responded;
  }

  // ── USERS CURRENTLY IN APPOINTMENT FLOW ──────────────────────────────────

  if (state.currentMenuId === "appointment_name") {
    const name = text.trim();
    responded = true;
    await socket.sendMessage(jid, { text: formatMenuMessage("appointment_topic") });
    await db.updateConversationState(jid, "appointment_topic", 1, [name]);
    return responded;
  }

  if (state.currentMenuId === "appointment_topic") {
    const topic = text.trim();
    responded = true;
    await socket.sendMessage(jid, { text: formatMenuMessage("appointment_time") });
    await db.updateConversationState(jid, "appointment_time", 2, [...state.history, topic]);
    return responded;
  }

  if (state.currentMenuId === "appointment_time") {
    const preferredTime = text.trim();
    const name = state.history[0] || "Unknown";
    const topic = state.history[1] || "Not specified";

    await db.saveAppointment(jid, name, topic, preferredTime);

    responded = true;
    await socket.sendMessage(jid, {
      text: `✅ Appointment booked!\n\n📋 Details:\nName: ${name}\nTopic: ${topic}\nPreferred Time: ${preferredTime}\n\nWe'll be in touch soon!`,
    });

    if (ownerJid) {
      await socket.sendMessage(ownerJid, {
        text: `📅 New Appointment Booking:\n\nName: ${name}\nFrom: ${jid}\nTopic: ${topic}\nPreferred Time: ${preferredTime}`,
      });
    }

    // Grant direct chat — they will never see a menu again
    await db.updateConversationState(jid, "chatting", 0, [], true);
    logger.info(`${jid} completed appointment booking — direct chat granted.`);
    return responded;
  }

  // ── USERS CURRENTLY IN AGENT FLOW ────────────────────────────────────────

  if (state.currentMenuId === "agent_start") {
    const firstAnswer = text.trim();
    responded = true;
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_problem") });
    await db.updateConversationState(jid, "agent_problem", 1, [firstAnswer]);
    return responded;
  }

  if (state.currentMenuId === "agent_problem") {
    const problem = text.trim();
    responded = true;
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_scale") });
    await db.updateConversationState(jid, "agent_scale", 2, [...state.history, problem]);
    return responded;
  }

  if (state.currentMenuId === "agent_scale") {
    const scale = text.trim();
    responded = true;
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_priority") });
    await db.updateConversationState(jid, "agent_priority", 3, [...state.history, scale]);
    return responded;
  }

  if (state.currentMenuId === "agent_priority") {
    const priority = text.trim();
    responded = true;
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_timeline") });
    await db.updateConversationState(jid, "agent_timeline", 4, [...state.history, priority]);
    return responded;
  }

  if (state.currentMenuId === "agent_timeline") {
    const timeline = text.trim();
    responded = true;
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_budget") });
    await db.updateConversationState(jid, "agent_budget", 5, [...state.history, timeline]);
    return responded;
  }

  if (state.currentMenuId === "agent_budget") {
    const budget = text.trim();
    const [firstAnswer, problem, scale, priority, timeline] = state.history;

    const summary =
      `✅ Thanks! Here is what we received:\n\n` +
      `- Goal: ${firstAnswer || "Not provided"}\n` +
      `- Main problem: ${problem || "Not provided"}\n` +
      `- Business size: ${scale || "Not provided"}\n` +
      `- Priority automation: ${priority || "Not provided"}\n` +
      `- Timeline: ${timeline || "Not provided"}\n` +
      `- Budget: ${budget || "Not provided"}`;

    responded = true;
    await socket.sendMessage(jid, {
      text: `${summary}\n\nOur team will review this and get back to you shortly.`,
    });

    if (ownerJid) {
      await socket.sendMessage(ownerJid, {
        text:
          ` New WhatsApp Agent Request:\n\nFrom: ${jid}\n` +
          `Goal: ${firstAnswer || "N/A"}\nProblem: ${problem || "N/A"}\n` +
          `Scale: ${scale || "N/A"}\nPriority: ${priority || "N/A"}\n` +
          `Timeline: ${timeline || "N/A"}\nBudget: ${budget || "N/A"}`,
      });
    }

    // Grant direct chat — they will never see a menu again
    await db.updateConversationState(jid, "chatting", 0, [], true);
    logger.info(`${jid} completed agent flow — direct chat granted.`);
    return responded;
  }

  // ── USERS IN NUMERIC MENU FLOW ────────────────────────────────────────────
  // Only reaches here if state exists but is NOT in a free-text flow
  // and NOT already on direct chat.

  if (conversationMenus[state.currentMenuId]) {
    const optionNumber = parseInt(text.trim(), 10);

    if (isNaN(optionNumber) || optionNumber < 1) {
      // If the user sent something that's not a valid option, resend the current menu
      // so they can choose without extra generic prompts.
      responded = true;
      await socket.sendMessage(jid, { text: formatMenuMessage(state.currentMenuId) });
      return responded;
    }

    const { nextMenuId, response } = getNextMenu(state.currentMenuId, optionNumber);

    if (response) {
      responded = true;
      await socket.sendMessage(jid, { text: response });
    }

    // Branching into appointment flow
    if (nextMenuId === "appointment_name") {
      responded = true;
      await socket.sendMessage(jid, { text: formatMenuMessage("appointment_name") });
      await db.updateConversationState(jid, "appointment_name", 0, [
        ...state.history,
        `${state.currentMenuId}(${optionNumber})`,
      ]);
      return responded;
    }

    // Branching into agent flow
    if (nextMenuId === "agent_start") {
      responded = true;
      await socket.sendMessage(jid, { text: formatMenuMessage("agent_start") });
      await db.updateConversationState(jid, "agent_start", 0, [
        ...state.history,
        `${state.currentMenuId}(${optionNumber})`,
      ]);
      return responded;
    }

    // Next numeric menu exists — show it
    if (nextMenuId && conversationMenus[nextMenuId]) {
      responded = true;
      await socket.sendMessage(jid, { text: formatMenuMessage(nextMenuId) });
      await db.updateConversationState(
        jid,
        nextMenuId,
        state.depth + 1,
        [...state.history, `${state.currentMenuId}(${optionNumber})`]
      );
      return responded;
    }

    // Terminal option on any other menu — grant direct chat instead of
    // bouncing them back to the start menu, since they have completed a flow
    await db.updateConversationState(jid, "chatting", 0, [], true);
    logger.info(`${jid} reached terminal option in "${state.currentMenuId}" — direct chat granted.`);
    return responded;
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  // State exists but currentMenuId is unrecognised (e.g. "chatting" without
  // allowDirectChat flag set — shouldn't happen but handle gracefully).
  logger.warn(`${jid} has unrecognised menu state "${state.currentMenuId}" — granting direct chat.`);
  await db.updateConversationState(jid, "chatting", 0, [], true);
  logger.info(`Free chat from ${jid}: ${text}`);

  // We didn't send a bot message here (we're granting free chat), so return whether we responded earlier
  return responded;
}

