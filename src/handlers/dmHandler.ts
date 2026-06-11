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

export async function handleDirectMessage(
  socket: WASocket,
  message: proto.IWebMessageInfo,
  tracker: ViolationTracker,
  db: Database,
  businessId: string
) {
  const businessService = new BusinessService(db);
  const jid = message.key?.remoteJid ?? "";
  const text = extractMessageText(message.message ?? undefined) ?? "";

  if (!text.trim()) return;

  // Blocked users — ignore silently
  if (await db.isBlocked(jid)) {
    logger.info(`Ignored message from blocked user ${jid}.`);
    return;
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
    await socket.sendMessage(jid, { text: autoReply });
    logger.info(`Sent autoreply to ${jid}: "${autoReply}"`);
    // For new users, return after autoreply. For users with state, continue processing.
    if (!state) {
      return;
    }
  }

  const ownerJid = await businessService.getOwnerJid(businessId);

  // ── RETURNING USER WITH ACTIVE CHAT ──────────────────────────────────────
  // Once allowDirectChat is true, never show menus again. Just pass through.
  if (state?.allowDirectChat) {
    logger.info(`Free chat from ${jid}: ${text}`);
    // Forward to owner or handle elsewhere — no menu, no interference
    if (ownerJid) {
      await socket.sendMessage(ownerJid, {
        text: `💬 Message from ${jid}:\n${text}`,
      });
    }
    return;
  }

  // ── BRAND NEW USER — no state at all ─────────────────────────────────────
  if (!state) {
    const menuMessage = formatMenuMessage("start");
    await socket.sendMessage(jid, { text: menuMessage });
    await db.updateConversationState(jid, "start", 0, []);
    logger.info(`New user ${jid} — sent start menu.`);
    return;
  }

  // ── USERS CURRENTLY IN APPOINTMENT FLOW ──────────────────────────────────

  if (state.currentMenuId === "appointment_name") {
    const name = text.trim();
    await socket.sendMessage(jid, { text: formatMenuMessage("appointment_topic") });
    await db.updateConversationState(jid, "appointment_topic", 1, [name]);
    return;
  }

  if (state.currentMenuId === "appointment_topic") {
    const topic = text.trim();
    await socket.sendMessage(jid, { text: formatMenuMessage("appointment_time") });
    await db.updateConversationState(jid, "appointment_time", 2, [...state.history, topic]);
    return;
  }

  if (state.currentMenuId === "appointment_time") {
    const preferredTime = text.trim();
    const name = state.history[0] || "Unknown";
    const topic = state.history[1] || "Not specified";

    await db.saveAppointment(jid, name, topic, preferredTime);

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
    return;
  }

  // ── USERS CURRENTLY IN AGENT FLOW ────────────────────────────────────────

  if (state.currentMenuId === "agent_start") {
    const firstAnswer = text.trim();
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_problem") });
    await db.updateConversationState(jid, "agent_problem", 1, [firstAnswer]);
    return;
  }

  if (state.currentMenuId === "agent_problem") {
    const problem = text.trim();
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_scale") });
    await db.updateConversationState(jid, "agent_scale", 2, [...state.history, problem]);
    return;
  }

  if (state.currentMenuId === "agent_scale") {
    const scale = text.trim();
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_priority") });
    await db.updateConversationState(jid, "agent_priority", 3, [...state.history, scale]);
    return;
  }

  if (state.currentMenuId === "agent_priority") {
    const priority = text.trim();
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_timeline") });
    await db.updateConversationState(jid, "agent_timeline", 4, [...state.history, priority]);
    return;
  }

  if (state.currentMenuId === "agent_timeline") {
    const timeline = text.trim();
    await socket.sendMessage(jid, { text: formatMenuMessage("agent_budget") });
    await db.updateConversationState(jid, "agent_budget", 5, [...state.history, timeline]);
    return;
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

    await socket.sendMessage(jid, {
      text: `${summary}\n\nOur team will review this and get back to you shortly.`,
    });

    if (ownerJid) {
      await socket.sendMessage(ownerJid, {
        text:
          `🤖 New WhatsApp Agent Request:\n\nFrom: ${jid}\n` +
          `Goal: ${firstAnswer || "N/A"}\nProblem: ${problem || "N/A"}\n` +
          `Scale: ${scale || "N/A"}\nPriority: ${priority || "N/A"}\n` +
          `Timeline: ${timeline || "N/A"}\nBudget: ${budget || "N/A"}`,
      });
    }

    // Grant direct chat — they will never see a menu again
    await db.updateConversationState(jid, "chatting", 0, [], true);
    logger.info(`${jid} completed agent flow — direct chat granted.`);
    return;
  }

  // ── USERS IN NUMERIC MENU FLOW ────────────────────────────────────────────
  // Only reaches here if state exists but is NOT in a free-text flow
  // and NOT already on direct chat.

  if (conversationMenus[state.currentMenuId]) {
    const optionNumber = parseInt(text.trim(), 10);

    if (isNaN(optionNumber) || optionNumber < 1) {
      // If the user sent something that's not a valid option, resend the current menu
      // so they can choose without extra generic prompts.
      await socket.sendMessage(jid, { text: formatMenuMessage(state.currentMenuId) });
      return;
    }

    const { nextMenuId, response } = getNextMenu(state.currentMenuId, optionNumber);

    if (response) {
      await socket.sendMessage(jid, { text: response });
    }

    // Branching into appointment flow
    if (nextMenuId === "appointment_name") {
      await socket.sendMessage(jid, { text: formatMenuMessage("appointment_name") });
      await db.updateConversationState(jid, "appointment_name", 0, [
        ...state.history,
        `${state.currentMenuId}(${optionNumber})`,
      ]);
      return;
    }

    // Branching into agent flow
    if (nextMenuId === "agent_start") {
      await socket.sendMessage(jid, { text: formatMenuMessage("agent_start") });
      await db.updateConversationState(jid, "agent_start", 0, [
        ...state.history,
        `${state.currentMenuId}(${optionNumber})`,
      ]);
      return;
    }

    // Next numeric menu exists — show it
    if (nextMenuId && conversationMenus[nextMenuId]) {
      await socket.sendMessage(jid, { text: formatMenuMessage(nextMenuId) });
      await db.updateConversationState(
        jid,
        nextMenuId,
        state.depth + 1,
        [...state.history, `${state.currentMenuId}(${optionNumber})`]
      );
      return;
    }

    // Terminal option on any other menu — grant direct chat instead of
    // bouncing them back to the start menu, since they have completed a flow
    await db.updateConversationState(jid, "chatting", 0, [], true);
    logger.info(`${jid} reached terminal option in "${state.currentMenuId}" — direct chat granted.`);
    return;
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  // State exists but currentMenuId is unrecognised (e.g. "chatting" without
  // allowDirectChat flag set — shouldn't happen but handle gracefully).
  logger.warn(`${jid} has unrecognised menu state "${state.currentMenuId}" — granting direct chat.`);
  await db.updateConversationState(jid, "chatting", 0, [], true);
  logger.info(`Free chat from ${jid}: ${text}`);
}