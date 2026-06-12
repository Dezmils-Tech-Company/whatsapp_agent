

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
    message: " Hello, This is Dezmils Tech Company, how may we help you today?\n\nSelect an option:",
    options: [
      { number: 1, label: "software solution; website,mobile app or an AI assistant", nextMenuId: "software" },
      {number: 2, label: " File KRA returns", nextMenuId: "returns_start" },
      {number: 3, label: " Cyber Services; Printing, binding, online services..", nextMenuId: "cyber" },
      { number: 4, label: "Installation Services; wifi, CCTV, DSTV...", nextMenuId: "installation" },
      { number: 5, label: " Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  software: {
    id: "software",
    message: " What software solution are you interested in?\n\nSelect an option:",
    options: [
      { number: 1, label: "Website", nextMenuId: "software_details" },
      { number: 2, label: "Mobile app", nextMenuId: "software_details" },
      { number: 3, label: "AI assistant / chatbot", nextMenuId: "software_details" },
      { number: 4, label: "Custom software / other", nextMenuId: "software_details" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  software_details: {
    id: "software_details",
    message: " Please provide brief details about the project or reply with the key features you need.",
    options: [
      { number: 1, label: "Reply with details", nextMenuId: "software_platform" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  software_platform: {
    id: "software_platform",
    message: " Which platform do you want (Web, iOS, Android, Cross-platform)?",
    options: [
      { number: 1, label: "Web", nextMenuId: "software_timeline" },
      { number: 2, label: "iOS", nextMenuId: "software_timeline" },
      { number: 3, label: "Android", nextMenuId: "software_timeline" },
      { number: 4, label: "Cross-platform", nextMenuId: "software_timeline" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  software_timeline: {
    id: "software_timeline",
    message: " When would you like the project to be completed?\n\nReply with your preferred timeline (e.g., 1 month, 3 months, ASAP).",
    options: [
      { number: 1, label: "Reply with timeline", response: null },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  cyber: {
    id: "cyber",
    message: " What cyber services are you interested in?\n\nSelect an option:",
    options: [
      { number: 1, label: "Printing / Binding / Online services", nextMenuId: "cyber_scope" },
      { number: 2, label: "Network / Security / VPN setup", nextMenuId: "cyber_scope" },
      { number: 3, label: "Hardware / Peripherals / Repairs", nextMenuId: "cyber_scope" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  cyber_scope: {
    id: "cyber_scope",
    message: " Please provide the scope or brief details (e.g., number of pages/devices, expected turnaround, location).\n\nSelect an option:",
    options: [
      { number: 1, label: "I will reply with details", nextMenuId: "cyber_timeline" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  cyber_timeline: {
    id: "cyber_timeline",
    message: " When would you like this service completed?\n\nReply with your preferred timeline (e.g., Today, Tomorrow, This week, ASAP).",
    options: [
      { number: 1, label: "Reply with timeline", response: null },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  // ── KRA RETURNS FLOW (3-step) ───────────────────────────────────────────
  returns_start: {
    id: "returns_start",
    message: " What type of KRA return do you want to file?\n\nSelect an option:",
    options: [
      { number: 1, label: "Individual - PAYE (P9)/Income Tax", nextMenuId: "returns_details" },
      { number: 2, label: "Company - PAYE/Corporate Tax", nextMenuId: "returns_details" },
      { number: 3, label: "KRA PIN registration / update", nextMenuId: "returns_details" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  returns_details: {
    id: "returns_details",
    message: " Please provide the taxpayer details we need: KRA PIN, full name or company name, ID/Passport or Company PIN, and contact phone/email.",
    options: [
      { number: 1, label: "Reply with taxpayer details", nextMenuId: "returns_documents" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  returns_documents: {
    id: "returns_documents",
    message: " Which documents do you have available? (e.g., P9 form, payslips, bank statements, company tax schedules). Please reply listing available documents.",
    options: [
      { number: 1, label: "I have P9 form and payslips", nextMenuId: "returns_schedule" },
      { number: 2, label: "I have company schedules / bank statements", nextMenuId: "returns_schedule" },
      { number: 3, label: "I need help obtaining P9 / documents", nextMenuId: "returns_schedule" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  returns_schedule: {
    id: "returns_schedule",
    message: " When would you like us to process the KRA returns?\n\nReply with preferred timeline (e.g., Today, This week, Within 3 days).",
    options: [
      { number: 1, label: "Reply with timeline", response: null },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },


  // ── INSTALLATION FLOW (3-step) ────────────────────────────────────────────
  installation_start: {
    id: "installation_start",
    message: " Which installation service do you need?\n\nSelect an option:",
    options: [
      { number: 1, label: "Wifi / Networking", nextMenuId: "installation_details" },
      { number: 2, label: "CCTV / Security cameras", nextMenuId: "installation_details" },
      { number: 3, label: "DSTV / TV setup", nextMenuId: "installation_details" },
      { number: 4, label: "Other installation", nextMenuId: "installation_details" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  installation_details: {
    id: "installation_details",
    message: "Please provide brief details about the installation (location, number of devices, special requirements).",
    options: [
      { number: 1, label: "Reply with details", nextMenuId: "installation_schedule" },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
    ],
  },

  installation_schedule: {
    id: "installation_schedule",
    message: "When would you like the installation to be done?\n\nReply with preferred date/time (e.g., Tomorrow 2pm, Next Monday 10am, ASAP).",
    options: [
      { number: 1, label: "Reply with preferred date/time", response: null },
      { number: 5, label: "Continue to chat", response: "Great, You can now write your message. Ezra will reply when available.", nextMenuId: null },
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
