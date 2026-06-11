import { makeWASocket, fetchLatestBaileysVersion } from "baileys";
import qrcode from "qrcode-terminal";
import { logger } from "./utils/logger.js";

export async function createBotSocket(authState: any) {
  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    auth: authState,
    browser: ["Ezra's Helper", "Desktop", "1.0"],
    version,
    markOnlineOnConnect: false,
    syncFullHistory: true,
    generateHighQualityLinkPreview: false,
  });

  socket.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update as any;
    if (qr) {
      logger.info("QR received — display it in terminal for scanning.");
      qrcode.generate(qr, { small: true });
      console.log('--- QR string (if you need to paste elsewhere) ---');
      console.log(qr);
    }
    if (connection === "open") {
      socket.sendPresenceUpdate("unavailable");
      logger.info("Bot connected and presence set to unavailable.");
    }
    if (connection === "close") {
      logger.warn("Connection closed", lastDisconnect?.error || 'unknown');
    }
  });

  socket.ev.on("creds.update", () => {
    logger.info("Authentication credentials updated.");
  });

  return socket;
}
