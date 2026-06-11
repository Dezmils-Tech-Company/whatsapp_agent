import dotenv from "dotenv";
dotenv.config();

function parseTime(value: string): { hour: number; minute: number } {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText ?? "0");
  const minute = Number(minuteText ?? "0");
  return {
    hour: Number.isFinite(hour) && hour >= 0 && hour < 24 ? hour : 8,
    minute: Number.isFinite(minute) && minute >= 0 && minute < 60 ? minute : 0,
  };
}

function quoteTimeToCron(value: string): string {
  const { hour, minute } = parseTime(value);
  return `${minute} ${hour} * * *`;
}

export const config = {
  businessId: process.env.BUSINESS_ID ?? "default-business",
  businessName: process.env.BUSINESS_NAME ?? "My Business",
  ownerJid: process.env.OWNER_JID ?? "", // WhatsApp JID of business owner
  authFolder: process.env.AUTH_FOLDER ?? "./auth_info",
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017",
  mongoDbName: process.env.MONGO_DB ?? "whatsapp-bot",
  quoteTime: process.env.QUOTE_TIME ?? "08:00",
  quoteCron: quoteTimeToCron(process.env.QUOTE_TIME ?? "08:00"),
  quietWindowStart: process.env.QUIET_WINDOW_START ?? "22:00",
  quietWindowEnd: process.env.QUIET_WINDOW_END ?? "08:00",
  replyCooldownSeconds: Number(process.env.REPLY_COOLDOWN_SECONDS ?? 60),
  logFile: process.env.LOG_FILE ?? "./logs/bot.log",
  port: Number(process.env.PORT ?? 3000),
};
