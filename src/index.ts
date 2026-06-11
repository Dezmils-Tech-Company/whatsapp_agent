import { useMultiFileAuthState } from "baileys/lib/Utils/use-multi-file-auth-state.js";
import { createBotSocket } from "./bot.js";
import { Database } from "./db/database.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { handleIncomingMessages } from "./handlers/messageHandler.js";
import { handlePresenceUpdate } from "./handlers/statusHandler.js";
import { handleConnectionUpdate } from "./handlers/connectionHandler.js";
import { startDailyQuoteScheduler } from "./utils/scheduler.js";
import { ViolationTracker } from "./rules/violationTracker.js";
import { BusinessService } from "./services/businessService.js";

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
}

bootstrap().catch((error) => {
  logger.error("Fatal bootstrap error", error as Error);
  process.exit(1);
});
