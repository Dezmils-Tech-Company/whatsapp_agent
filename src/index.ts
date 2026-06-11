import { useMultiFileAuthState } from "baileys/lib/Utils/use-multi-file-auth-state.js";
import { createBotSocket, lastQrString } from "./bot.js";
import { Database } from "./db/database.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { handleIncomingMessages } from "./handlers/messageHandler.js";
import { handlePresenceUpdate } from "./handlers/statusHandler.js";
import { handleConnectionUpdate } from "./handlers/connectionHandler.js";
import { startDailyQuoteScheduler } from "./utils/scheduler.js";
import { ViolationTracker } from "./rules/violationTracker.js";
import { BusinessService } from "./services/businessService.js";
import http from "http";

let db: Database;
let tracker: ViolationTracker;
let businessService: BusinessService;
let socket = null as any;

async function initializeSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authFolder);
  socket = await createBotSocket(state);
  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("messages.upsert", async (upsert: any) => {
    await handleIncomingMessages(socket, upsert, tracker, db, config.businessId);
  });

  socket.ev.on("presence.update", async (update: any) => {
    await handlePresenceUpdate(socket, update, db);
  });

  socket.ev.on("connection.update", async (update: any) => {
    await handleConnectionUpdate(socket, update, async () => {
      await restartSocket();
    });
  });

  return socket;
}

async function restartSocket() {
  logger.info("Restarting WhatsApp connection...");
  try {
    socket.ev.removeAllListeners();
    socket.end();
  } catch (error) {
    logger.warn("Socket cleanup failed during restart.", error as Error);
  }

  await initializeSocket();
}

async function bootstrap() {
  logger.info("Starting WhatsApp bot...");
  logger.info(`Business: ${config.businessName} (ID: ${config.businessId})`);

  db = new Database(config.mongoUri, config.mongoDbName);

  try {
    await db.connect();
  } catch (error) {
    const err = error as any;
    if (err?.code === "ECONNREFUSED") {
      logger.error(`MongoDB connection refused at ${config.mongoUri}. Make sure MongoDB is running.`);
    } else {
      logger.error(`Failed to connect to MongoDB at ${config.mongoUri}.`, error as Error);
    }
    process.exit(1);
  }

  // Initialize business service and configuration
  businessService = new BusinessService(db);
  if (config.ownerJid) {
    await businessService.initializeBusiness(config.businessId, config.businessName, config.ownerJid);
  } else {
    logger.warn("OWNER_JID not set in environment. Business configuration incomplete.");
  }

  tracker = new ViolationTracker(db);
  await initializeSocket();
  startDailyQuoteScheduler(() => socket, db);

  // ── HEALTH CHECK SERVER FOR RENDER ────────────────────────────────────────
  // Render requires a service to listen on a port. This minimal HTTP server
  // provides a health check endpoint and a live QR access page.
  const healthServer = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          bot: "whatsapp",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      );
    } else if (req.url === "/qr" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      const qrContent = lastQrString
        ? `<p>Scan this QR code with WhatsApp to authenticate the bot:</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
            lastQrString
          )}" alt="WhatsApp QR code" />
          <p>Or use the raw QR text below if needed:</p>
          <pre style="white-space: pre-wrap; word-break: break-all;">${lastQrString}</pre>
          <p><small>Refresh this page after a new QR is generated.</small></p>`
        : `<p>No QR code is currently available.</p>
          <p>Start the bot and check back here when the connection needs authentication.</p>`;
      res.end(`<!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>WhatsApp Bot QR</title>
          </head>
          <body style="font-family: Arial, sans-serif; margin: 24px;">
            <h1>WhatsApp Bot QR Access</h1>
            ${qrContent}
            <p><a href="/">Back to status</a></p>
          </body>
        </html>`);
    } else if (req.url === "/" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <title>WhatsApp Bot Live</title>
          </head>
          <body style="font-family: Arial, sans-serif; margin: 24px;">
            <h1>WhatsApp Bot is running</h1>
            <p>Service status: <strong>online</strong></p>
            <p><a href="/qr">Open QR access page</a></p>
            <p><small>Use this page from your Render live URL to retrieve the latest QR scan link.</small></p>
          </body>
        </html>`);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found\n");
    }
  });

  healthServer.listen(config.port, () => {
    logger.info(`Health check server listening on port ${config.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Fatal bootstrap error", error as Error);
  process.exit(1);
});
