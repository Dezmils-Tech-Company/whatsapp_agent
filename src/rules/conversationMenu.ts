/**
 * Conversation menu system — defines the conversation tree
 * Each menu has options that lead to the next menu or to direct chat escalation
 */

export interface MenuOption {
  number: number;
  label: string;
  nextMenuId?: string | null; // undefined or null means escalate to direct chat
  response?: string | null;
}

export interface Menu {
  id: string;
  message: string;
  options: MenuOption[];
}

export const conversationMenus: Record<string, Menu> = {
  start: {
    id: "start",
    message: " Hi! This is Dezmils Tech Company, how may we help you?\n\nSelect an option:",
    options: [
      { number: 1, label: " Book an appointment", nextMenuId: "appointment_name" },
      { number: 2, label: " Get access to our WhatsApp agent", nextMenuId: "agent_start" },
      { number: 3, label: " Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  // ── APPOINTMENT FLOW ──────────────────────────────────────────────────────
  appointment_name: {
    id: "appointment_name",
    message: " What is your name?",
    options: [
      { number: 1, label: "Reply with your name", response: null },
    ],
  },

  appointment_topic: {
    id: "appointment_topic",
    message: " What would you like to discuss?",
    options: [
      { number: 1, label: "Reply with your topic", response: null },
    ],
  },

  appointment_time: {
    id: "appointment_time",
    message: " When would you prefer to meet?\n\nReply with your preferred date/time (e.g., Tomorrow 2pm, Next Monday 10am, ASAP).",
    options: [
      { number: 1, label: "Reply with your preferred time", response: null },
    ],
  },

  // ── AGENT FLOW ────────────────────────────────────────────────────────────
  agent_start: {
    id: "agent_start",
    message: " What would you like our WhatsApp agent to help you with?",
    options: [
      { number: 1, label: "Reply with your answer", response: null },
    ],
  },

  agent_problem: {
    id: "agent_problem",
    message: " What is the main business problem or task you want the agent to solve?",
    options: [
      { number: 1, label: "Reply with your answer", response: null },
    ],
  },

  agent_scale: {
    id: "agent_scale",
    message: " What size is your team or business?",
    options: [
      { number: 1, label: "Reply with your answer", response: null },
    ],
  },

  agent_priority: {
    id: "agent_priority",
    message: " Which process would you like to automate first?",
    options: [
      { number: 1, label: "Reply with your answer", response: null },
    ],
  },

  agent_timeline: {
    id: "agent_timeline",
    message: " When would you like the WhatsApp agent to be ready?",
    options: [
      { number: 1, label: "Reply with your timeline", response: null },
    ],
  },

  agent_budget: {
    id: "agent_budget",
    message: " How much are you willing to pay to use our WhatsApp agent?",
    options: [
      { number: 1, label: "Reply with your budget", response: null },
    ],
  },
};

/**
 * Format menu as WhatsApp message with numbered options
 */
export function formatMenuMessage(menuId: string): string {
  const menu = conversationMenus[menuId];
  if (!menu) return "Invalid menu. Please start over.";

  const optionsText = menu.options
    .map((opt) => `${opt.number}. ${opt.label}`)
    .join("\n");

  return `${menu.message}\n\n${optionsText}`;
}

export interface MenuResult {
  nextMenuId: string | null | undefined;
  response: string | null | undefined;
}

/**
 * Get the next menu ID or null/undefined (escalate) based on user choice
 */
export function getNextMenu(
  currentMenuId: string,
  optionNumber: number
): MenuResult {
  const menu = conversationMenus[currentMenuId];
  if (!menu) return { nextMenuId: undefined, response: undefined };

  const option = menu.options.find((opt) => opt.number === optionNumber);
  if (!option) return { nextMenuId: undefined, response: undefined };

  return {
    nextMenuId: option.nextMenuId || undefined,
    response: option.response || undefined,
  };
}

/**
 * Check if user should be escalated to direct chat
 * Escalate if: nextMenuId is null/undefined OR depth >= 3
 */
export function shouldEscalate(nextMenuId?: string | null, depth?: number): boolean {
  return !nextMenuId || (depth ?? 0) >= 3;
}
