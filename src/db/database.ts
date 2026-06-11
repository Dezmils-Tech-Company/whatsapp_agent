import { MongoClient, type Collection, type Db as MongoDb } from "mongodb";
import { logger } from "../utils/logger.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type ViolationDocument = {
  jid: string;
  count: number;
  last_seen: number;
  reason?: string;
};

type BlockedUserDocument = {
  jid: string;
  blocked_at: number;
  reason?: string;
};

type QuoteLogDocument = {
  date: string;
  quote_text: string;
  posted_at: number;
};

export class DatabaseLayer {
  private client: MongoClient;
  private db?: MongoDb;
  private databaseName: string;
  private violations?: Collection<ViolationDocument>;
  private blockedUsers?: Collection<BlockedUserDocument>;
  private quoteLog?: Collection<QuoteLogDocument>;

  constructor(uri: string, dbName: string) {
    this.client = new MongoClient(uri, {
      appName: "WhatsApp Bot",
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    this.databaseName = dbName;

    this.connect = this.connect.bind(this);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.databaseName);
    this.violations = this.db.collection<ViolationDocument>("violations");
    this.blockedUsers = this.db.collection<BlockedUserDocument>("blocked_users");
    this.quoteLog = this.db.collection<QuoteLogDocument>("quote_log");

    await Promise.all([
      this.violations.createIndex({ jid: 1 }, { unique: true }),
      this.blockedUsers.createIndex({ jid: 1 }, { unique: true }),
      this.quoteLog.createIndex({ date: 1 }, { unique: true }),
    ]);

    logger.info("Connected to MongoDB and initialized collections.");
  }

  private ensureConnected() {
    if (!this.db || !this.violations || !this.blockedUsers || !this.quoteLog) {
      throw new Error("Database is not connected.");
    }
  }

  async getViolation(jid: string) {
    this.ensureConnected();
    const violations = this.violations!;
    return violations.findOne({ jid });
  }

  async upsertViolation(jid: string, count: number, lastSeen: number, reason: string) {
    this.ensureConnected();
    const violations = this.violations!;
    await violations.updateOne(
      { jid },
      { $set: { count, last_seen: lastSeen, reason } },
      { upsert: true }
    );
  }

  async deleteViolation(jid: string) {
    this.ensureConnected();
    const violations = this.violations!;
    await violations.deleteOne({ jid });
  }

  async isBlocked(jid: string) {
    this.ensureConnected();
    const blockedUsers = this.blockedUsers!;
    return (await blockedUsers.findOne({ jid })) !== null;
  }

  async blockUser(jid: string, reason: string) {
    this.ensureConnected();
    const blockedUsers = this.blockedUsers!;
    await blockedUsers.updateOne(
      { jid },
      { $set: { blocked_at: Date.now(), reason } },
      { upsert: true }
    );
    logger.action(`Blocked user ${jid}: ${reason}`);
  }

  async logQuote(date: string, quoteText: string) {
    this.ensureConnected();
    const quoteLog = this.quoteLog!;
    await quoteLog.updateOne(
      { date },
      { $set: { quote_text: quoteText, posted_at: Date.now() } },
      { upsert: true }
    );
  }

  async resetExpiredViolations() {
    this.ensureConnected();
    const violations = this.violations!;
    const cutoff = Date.now() - ONE_DAY_MS;
    await violations.deleteMany({ last_seen: { $lt: cutoff } });
  }

  async close() {
    await this.client.close();
  }
}

export { DatabaseLayer as Database };
