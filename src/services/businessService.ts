import { Database } from "../db/database.js";
import { logger } from "../utils/logger.js";

/**
 * Business Service — manages business configuration and multi-tenant logic
 */
export class BusinessService {
  constructor(private db: Database) {}

  /**
   * Initialize business configuration (run once per business)
   */
  async initializeBusiness(businessId: string, businessName: string, ownerJid: string) {
    try {
      const existing = await this.db.getBusinessConfig(businessId);
      if (existing) {
        logger.info(`Business "${businessId}" already initialized.`);
        return existing;
      }

      await this.db.upsertBusinessConfig({
        businessId,
        businessName,
        ownerJid,
        description: `Automated WhatsApp bot for ${businessName}`,
        welcomeMessage: `👋 Hi! Welcome to ${businessName}. How can I help you?`,
        appointmentEnabled: true,
        quoteEnabled: false,
        quoteCron: "0 8 * * *",
      });

      logger.info(`Initialized business: ${businessId} (Owner: ${ownerJid})`);
      return await this.db.getBusinessConfig(businessId);
    } catch (error) {
      logger.error(`Failed to initialize business ${businessId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get business config by ID
   */
  async getBusinessConfig(businessId: string) {
    return await this.db.getBusinessConfig(businessId);
  }

  /**
   * Update business configuration
   */
  async updateBusinessConfig(
    businessId: string,
    updates: Partial<{
      businessName: string;
      description: string;
      welcomeMessage: string;
      appointmentEnabled: boolean;
      quoteEnabled: boolean;
      quoteCron: string;
    }>
  ) {
    const config = await this.db.getBusinessConfig(businessId);
    if (!config) {
      throw new Error(`Business ${businessId} not found`);
    }

    const updatePayload: any = {
      businessId: config.businessId,
      businessName: updates.businessName ?? config.businessName,
      ownerJid: config.ownerJid,
    };

    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.welcomeMessage !== undefined) updatePayload.welcomeMessage = updates.welcomeMessage;
    if (updates.appointmentEnabled !== undefined) updatePayload.appointmentEnabled = updates.appointmentEnabled;
    if (updates.quoteEnabled !== undefined) updatePayload.quoteEnabled = updates.quoteEnabled;
    if (updates.quoteCron !== undefined) updatePayload.quoteCron = updates.quoteCron;

    await this.db.upsertBusinessConfig(updatePayload);

    logger.info(`Updated business config for ${businessId}`);
    return await this.db.getBusinessConfig(businessId);
  }

  /**
   * Get owner JID for a business (for sending notifications)
   */
  async getOwnerJid(businessId: string): Promise<string | null> {
    const config = await this.db.getBusinessConfig(businessId);
    return config?.ownerJid || null;
  }

  /**
   * Check if appointments are enabled for a business
   */
  async appointmentsEnabled(businessId: string): Promise<boolean> {
    const config = await this.db.getBusinessConfig(businessId);
    return config?.appointmentEnabled ?? true;
  }

  /**
   * Check if quotes are enabled for a business
   */
  async quotesEnabled(businessId: string): Promise<boolean> {
    const config = await this.db.getBusinessConfig(businessId);
    return config?.quoteEnabled ?? false;
  }

  /**
   * Get welcome message for a business
   */
  async getWelcomeMessage(businessId: string): Promise<string> {
    const config = await this.db.getBusinessConfig(businessId);
    return (
      config?.welcomeMessage ||
      `👋 Hi! How can I help you today?\n\nSelect an option:`
    );
  }
}
