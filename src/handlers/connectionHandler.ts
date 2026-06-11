import { DisconnectReason } from "baileys";
import { logger } from "../utils/logger.js";

export async function handleConnectionUpdate(socket: any, update: any, onReconnect: () => Promise<void>) {
  const connection = update.connection;
  const lastDisconnect = update.lastDisconnect;

  if (connection === "open") {
    await socket.sendPresenceUpdate("unavailable");
    logger.info("Connection opened and presence reset to unavailable.");
    return;
  }

  if (connection === "close") {
    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
    logger.warn(`Connection closed with status code ${statusCode}.`);

    if (statusCode === DisconnectReason.loggedOut) {
      logger.error("The bot has been logged out. Re-authentication is required.");
      process.exit(0);
      return;
    }

    logger.info("Attempting graceful reconnect...");
    try {
      await onReconnect();
    } catch (error) {
      logger.error("Reconnect failed.", error as Error);
      process.exit(1);
    }
  }
}
