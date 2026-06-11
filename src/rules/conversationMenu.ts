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
    message: "👋 Hi! How can I help you today?\n\nSelect an option:",
    options: [
      { number: 1, label: "💻 Build a website", nextMenuId: "website" },
      { number: 2, label: "🤖 Train an AI model", nextMenuId: "ai" },
      { number: 3, label: "📋 File returns", nextMenuId: "filing" },
      { number: 4, label: "💬 Book an appointment with Ezra", nextMenuId: "appointment_name" },
    ],
  },

  website: {
    id: "website",
    message: "🌐 Website Development\n\nWhat type of website do you need?",
    options: [
      { number: 1, label: "📱 E-commerce store", response: "Great! I'll note your interest in an e-commerce site." },
      { number: 2, label: "🎯 Business website", response: "Perfect! I'll help you build a professional site." },
      { number: 3, label: "📊 Portfolio/blog", response: "Nice choice! I'll set that up for you." },
      { number: 4, label: "💬 Book appointment with Ezra instead", nextMenuId: "appointment_name" },
    ],
  },

  ai: {
    id: "ai",
    message: "🤖 AI Model Training\n\nWhat type of model are you interested in?",
    options: [
      { number: 1, label: "📊 Classification model", response: "Noted! Classification tasks are my specialty." },
      { number: 2, label: "🔍 Detection/Recognition", response: "Great! Vision-based models are powerful." },
      { number: 3, label: "💬 Natural language model", response: "Excellent! NLP has many applications." },
      { number: 4, label: "💬 Book appointment with Ezra instead", nextMenuId: "appointment_name" },
    ],
  },

  filing: {
    id: "filing",
    message: "📋 File Returns & Documentation\n\nWhat type of filing assistance do you need?",
    options: [
      { number: 1, label: "🇳🇬 Tax returns (Nigeria)", response: "I'll help you with Nigerian tax filing." },
      { number: 2, label: "📑 Business registration", response: "Business docs coming right up!" },
      { number: 3, label: "✏️ Document preparation", response: "I can assist with all document prep." },
      { number: 4, label: "💬 Book appointment with Ezra instead", nextMenuId: "appointment_name" },
    ],
  },

  appointment_name: {
    id: "appointment_name",
    message: "📅 Let's book an appointment!\n\nWhat is your name?",
    options: [
      { number: 1, label: "Reply with your name", response: null },
    ],
  },

  appointment_topic: {
    id: "appointment_topic",
    message: "📅 What would you like to discuss?",
    options: [
      { number: 1, label: "Reply with your topic", response: null },
    ],
  },

  appointment_time: {
    id: "appointment_time",
    message: "📅 When would you prefer to meet?\n\nReply with your preferred date/time (e.g., Tomorrow 2pm, Next Monday 10am, ASAP).",
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
