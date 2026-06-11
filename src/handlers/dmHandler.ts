import type { WASocket, proto } from "baileys";
import { logger } from "../utils/logger.js";
import type { Database } from "../db/database.js";
import type { ViolationTracker } from "../rules/violationTracker.js";
import { extractMessageText } from "../utils/messageHelpers.js";
import {
  formatMenuMessage,
  getNextMenu,
  shouldEscalate,
  conversationMenus,
} from "../rules/conversationMenu.js";
import { BusinessService } from "../services/businessService.js";

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

  if (!text.trim()) {
    return;
  }

  // Check if user is blocked
  if (await db.isBlocked(jid)) {
    logger.info(`Ignored message from blocked user ${jid}.`);
    return;
  }

  // Get business owner JID for notifications
  const ownerJid = await businessService.getOwnerJid(businessId);

  // Get conversation state
  const state = await db.getConversationState(jid);

  // NEW USERS → Show start menu only
  if (!state) {
    const menuMessage = formatMenuMessage("start");
    await socket.sendMessage(jid, { text: menuMessage });
    await db.updateConversationState(jid, "start", 0, []);
    logger.info(`Started conversation menu with ${jid}`);
    return;
  }

  // RETURNING USERS with chat history → skip menu, handle appointment or normal chat
  if (state.currentMenuId === "start" || state.currentMenuId === "website" || state.currentMenuId === "ai" || state.currentMenuId === "filing") {
    // User is still in main menu flow → expect numbered option
    const optionNumber = parseInt(text.trim(), 10);
    if (isNaN(optionNumber) || optionNumber < 1) {
      await socket.sendMessage(jid, {
        text: "Please reply with the option number (1, 2, 3, or 4).",
      });
      return;
    }

    const { nextMenuId, response } = getNextMenu(state.currentMenuId, optionNumber);

    // Send option response if available
    if (response) {
      await socket.sendMessage(jid, { text: response });
    }

    // Check if we should escalate or move to appointment booking
    const nextDepth = state.depth + 1;
    
    // Check if user selected appointment booking
    if (nextMenuId === "appointment_name") {
      // Move to appointment booking flow
      const appointmentMenu = formatMenuMessage("appointment_name");
      await socket.sendMessage(jid, { text: appointmentMenu });
      await db.updateConversationState(jid, "appointment_name", 0, [`${state.currentMenuId}(${optionNumber})`]);
      logger.info(`${jid} started appointment booking.`);
      return;
    }

    // Check if we should escalate to direct chat (after 3 steps of normal menu)
    if (shouldEscalate(nextMenuId, nextDepth)) {
      await db.resetConversationState(jid);
      await socket.sendMessage(jid, {
        text: "I'll pass this along to the team. What would you like to discuss?",
      });
      logger.info(`Escalated conversation with ${jid} to direct chat (depth: ${nextDepth}).`);
      return;
    }

    // Show next menu
    const nextMenu = conversationMenus[nextMenuId!];
    if (!nextMenu) {
      await socket.sendMessage(jid, {
        text: "Something went wrong. Let me restart the menu.",
      });
      await db.resetConversationState(jid);
      return;
    }

    const nextMenuMessage = formatMenuMessage(nextMenuId!);
    await socket.sendMessage(jid, { text: nextMenuMessage });

    // Update conversation state with new menu and history
    const newHistory = [...state.history, `${state.currentMenuId}(${optionNumber})`];
    await db.updateConversationState(jid, nextMenuId!, nextDepth, newHistory);

    logger.info(`${jid} selected option ${optionNumber} in menu "${state.currentMenuId}".`);
    return;
  }

  // APPOINTMENT BOOKING FLOW
  if (state.currentMenuId === "appointment_name") {
    const name = text.trim();
    const appointmentMenu = formatMenuMessage("appointment_topic");
    await socket.sendMessage(jid, { text: appointmentMenu });
    await db.updateConversationState(jid, "appointment_topic", 1, [name]);
    logger.info(`${jid} provided name for appointment: ${name}`);
    return;
  }

  if (state.currentMenuId === "appointment_topic") {
    const topic = text.trim();
    const appointmentMenu = formatMenuMessage("appointment_time");
    await socket.sendMessage(jid, { text: appointmentMenu });
    await db.updateConversationState(jid, "appointment_time", 2, [...state.history, topic]);
    logger.info(`${jid} provided topic for appointment: ${topic}`);
    return;
  }

  if (state.currentMenuId === "appointment_time") {
    const preferredTime = text.trim();
    const name = state.history[0] || "Unknown";
    const topic = state.history[1] || "Not specified";

    // Save appointment
    await db.saveAppointment(jid, name, topic, preferredTime);

    // Confirm to user
    await socket.sendMessage(jid, {
      text: `✅ Appointment booked!\n\n📋 Details:\nName: ${name}\nTopic: ${topic}\nPreferred Time: ${preferredTime}\n\nWe'll be in touch soon!`,
    });

    // Notify business owner
    if (ownerJid) {
      await socket.sendMessage(ownerJid, {
        text: `📅 New Appointment Booking:\n\nName: ${name}\nFrom: ${jid}\nTopic: ${topic}\nPreferred Time: ${preferredTime}`,
      });
    }

    // Reset conversation state after appointment is booked
    await db.resetConversationState(jid);
    logger.info(`${jid} completed appointment booking. Details: ${name} | ${topic} | ${preferredTime}`);
    return;
  }

  // NORMAL CHAT (no menu state, just reply)
  logger.info(`${jid} sent: ${text}`);
}


