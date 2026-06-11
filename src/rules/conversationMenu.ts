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
    message: " Hi! this is Dezmils tech company, how may we help you?\n\nSelect an option:",
    options: [
      { number: 1, label: " Build a website/Mobile app", nextMenuId: "website" },
      { number: 2, label: " Consult us on AI automation and project partnership", nextMenuId: "ai" },
      { number: 3, label: " File KRA returns", nextMenuId: "filing" },
      { number: 4, label: " Book A Career Talk with Dezmils", nextMenuId: "career_talk" },
      { number: 5, label: " Get access to our WhatsApp agent", nextMenuId: "agent_start" },
      { number: 6, label: " Continue to chat", nextMenuId: "chat_q1" },
    ],
  },

  website: {
    id: "website",
    message: " Website Development\n\nWhat type of website do you need?",
    options: [
      { number: 1, label: " E-commerce store", response: "Great! I'll note your interest in an e-commerce site." },
      { number: 2, label: " Business website", response: "Perfect! I'll help you build a professional site." },
      { number: 3, label: " Portfolio/blog", response: "Nice choice! I'll set that up for you." },
      { number: 4, label: " Book appointment with Ezra instead", nextMenuId: "appointment_name" },
    ],
  },

  ai: {
    id: "ai",
    message: " AI Model Training\n\nWhat type of model are you interested in?",
    options: [
      { number: 1, label: " Classification model", response: "Noted! Classification tasks are my specialty." },
      { number: 2, label: " Detection/Recognition", response: "Great! Vision-based models are powerful." },
      { number: 3, label: " Natural language model", response: "Excellent! NLP has many applications." },
      { number: 4, label: " Book appointment with Ezra instead", nextMenuId: "appointment_name" },
    ],
  },

  filing: {
    id: "filing",
    message: " File Returns & Documentation\n\nWhat type of filing assistance do you need?",
    options: [
      { number: 1, label: " Tax returns (Nigeria)", response: "I'll help you with Nigerian tax filing." },
      { number: 2, label: " Business registration", response: "Business docs coming right up!" },
      { number: 3, label: " Document preparation", response: "I can assist with all document prep." },
      { number: 4, label: " Book appointment with Ezra instead", nextMenuId: "appointment_name" },
    ],
  },

    career_talk: { 
    id: "career_talk",
    message: " Career Talk with Dezmils\n\nWhat would you like to discuss in your career talk?",
    options: [
        { number: 1, label: " Startup advice", response: "Dezmils has tons of startup experience to share!" },
        { number: 2, label: " Career growth", response: "Let's talk about how to level up your career!" },
        { number: 3, label: " Tech skills", response: "Dezmils can guide you on in-demand tech skills!" },
        { number: 4, label: " Book appointment with Dezmils instead", nextMenuId: "appointment_name" },
    ],
  },

    agent_start: {
    id: "agent_start",
    message: " Access Our WhatsApp Agent\n\nWhat would you like our WhatsApp agent to help you with?",
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

  chat_q1: {
    id: "chat_q1",
    message: "Did you know that Ezra is a bonafide software engineer who crafts high end software solutions?",
    options: [
      { number: 1, label: "Yes", nextMenuId: "chat_q2" },
      { number: 2, label: "No", response: "Ezra is a bonafide software engineer with 5 years experience building web and mobile apps.", nextMenuId: "chat_q2" },
    ],
  },

  chat_q2: {
    id: "chat_q2",
    message: " Would you like to hear about recent projects?",
    options: [
      { number: 1, label: "Yes", nextMenuId: "chat_q3" },
      { number: 2, label: "No", response: "No problem — I can instead share a short summary when you're ready.", nextMenuId: "chat_q3" },
    ],
  },

  chat_q3: {
    id: "chat_q3",
    message: "Are you interested in hiring or learning about his services?",
    options: [
      { number: 1, label: "Yes", nextMenuId: "chat_done" },
      { number: 2, label: "No", response: "Understood — I'll keep things light and only share what you ask for.", nextMenuId: "chat_q4" },
    ],
  },

  chat_done: {
    id: "chat_done",
    message: "Thanks! You can now continue the conversation freely.",
    options: [
      { number: 1, label: "Continue", response: null, nextMenuId: null },
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
