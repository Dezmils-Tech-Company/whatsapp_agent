import { makeWASocket, fetchLatestBaileysVersion } from "baileys";
import qrcode from "qrcode-terminal";
import { logger } from "./utils/logger.js";

export let lastQrString: string | null = null;

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

    // Only print QR when it changes — avoids spamming the terminal
    // if Baileys emits the same QR multiple times for the same auth attempt.
    // Clear cached QR when connection opens so a fresh QR can be shown next time.
    if (qr) {
      // cache last printed QR on the socket object to keep state per instance
      const lastQr = (socket as any)._lastPrintedQr as string | undefined;
      if (qr !== lastQr) {
        (socket as any)._lastPrintedQr = qr;
        lastQrString = qr;
        logger.info("QR received — display it in terminal for scanning.");
        qrcode.generate(qr, { small: true });
        console.log('--- QR string (if you need to paste elsewhere) ---');
        console.log(qr);
      }
    }

    if (connection === "open") {
      // clear cached QR when connected
      (socket as any)._lastPrintedQr = undefined;
      lastQrString = null;
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
