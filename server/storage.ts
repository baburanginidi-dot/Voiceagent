import {
  users,
  type User,
  type InsertUser,
  stageMovements,
  type InsertStageMovement,
  transcripts,
  type InsertTranscript,
  userSessions,
  type InsertUserSession,
  stages,
  systemPrompts,
  adminDocuments,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

/**
 * @interface IStorage
 * Defines the contract for storage operations, providing an abstraction layer for data access.
 */
export interface IStorage {
  /**
   * Retrieves a user by their ID.
   * @param {number} id - The ID of the user.
   * @returns {Promise<User | undefined>} The user object or undefined if not found.
   */
  getUser(id: number): Promise<User | undefined>;

  /**
   * Retrieves a user by their phone number.
   * @param {string} phoneNumber - The phone number of the user.
   * @returns {Promise<User | undefined>} The user object or undefined if not found.
   */
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;

  /**
   * Creates a new user.
   * @param {InsertUser} insertUser - The user data to insert.
   * @returns {Promise<User>} The newly created user.
   */
  createUser(insertUser: InsertUser): Promise<User>;
  
  /**
   * Retrieves a stage by its ID.
   * @param {number} id - The ID of the stage.
   * @returns {Promise<any>} The stage object or undefined if not found.
   */
  getStageById(id: number): Promise<any>;

  /**
   * Retrieves the system prompt for a specific stage.
   * @param {number} stageId - The ID of the stage.
   * @returns {Promise<any>} The system prompt object or undefined if not found.
   */
  getSystemPromptByStage(stageId: number): Promise<any>;
  
  /**
   * Retrieves admin documents for a specific stage.
   * @param {number} stageId - The ID of the stage.
   * @returns {Promise<any[]>} An array of admin documents.
   */
  getAdminDocumentsByStage(stageId: number): Promise<any[]>;

  /**
   * Retrieves the current stage of a user.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<any>} The latest stage movement record.
   */
  getUserCurrentStage(userId: number): Promise<any>;

  /**
   * Records a stage movement for a user.
   * @param {InsertStageMovement} movement - The stage movement data to insert.
   * @returns {Promise<any>} The newly created stage movement record.
   */
  recordStageMovement(movement: InsertStageMovement): Promise<any>;
  
  /**
   * Saves a transcript of a conversation.
   * @param {InsertTranscript} transcript - The transcript data to insert.
   * @returns {Promise<any>} The newly created transcript record.
   */
  saveTranscript(transcript: InsertTranscript): Promise<any>;

  /**
   * Retrieves the transcripts for a specific user.
   * @param {number} userId - The ID of the user.
   * @param {number} [limit] - The maximum number of transcripts to retrieve.
   * @returns {Promise<any[]>} An array of transcript records.
   */
  getUserTranscripts(userId: number, limit?: number): Promise<any[]>;

  /**
   * Retrieves all transcripts.
   * @param {number} [limit] - The maximum number of transcripts to retrieve.
   * @returns {Promise<any[]>} An array of all transcript records.
   */
  getAllTranscripts(limit?: number): Promise<any[]>;
  
  /**
   * Creates a new user session.
   * @param {InsertUserSession} session - The session data to insert.
   * @returns {Promise<any>} The newly created session record.
   */
  createUserSession(session: InsertUserSession): Promise<any>;

  /**
   * Retrieves the active session for a user.
   * @param {number} userId - The ID of the user.
   * @returns {Promise<any>} The active session record or undefined if none exists.
   */
  getUserActiveSession(userId: number): Promise<any>;

  /**
   * Ends a user session.
   * @param {string} sessionId - The ID of the session to end.
   * @returns {Promise<void>}
   */
  endUserSession(sessionId: string): Promise<void>;
}

/**
 * @class DatabaseStorage
 * Implements the `IStorage` interface using a database as the backend.
 */
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Stage operations
  async getStageById(id: number): Promise<any> {
    const [stage] = await db.select().from(stages).where(eq(stages.id, id));
    return stage || undefined;
  }

  async getSystemPromptByStage(stageId: number): Promise<any> {
    const [prompt] = await db
      .select()
      .from(systemPrompts)
      .where(eq(systemPrompts.stageId, stageId))
      .where(eq(systemPrompts.isActive, true));
    return prompt || undefined;
  }

  async getAdminDocumentsByStage(stageId: number): Promise<any[]> {
    const docs = await db
      .select()
      .from(adminDocuments)
      .where(eq(adminDocuments.stageId, stageId));
    return docs;
  }

  // Stage movement operations
  async getUserCurrentStage(userId: number): Promise<any> {
    const [movement] = await db
      .select()
      .from(stageMovements)
      .where(eq(stageMovements.userId, userId))
      .orderBy(desc(stageMovements.movedAt));
    return movement || undefined;
  }

  async recordStageMovement(movement: InsertStageMovement): Promise<any> {
    const [result] = await db.insert(stageMovements).values(movement).returning();
    return result;
  }

  // Transcript operations
  async saveTranscript(transcript: InsertTranscript): Promise<any> {
    const [result] = await db.insert(transcripts).values(transcript).returning();
    return result;
  }

  async getUserTranscripts(userId: number, limit: number = 100): Promise<any[]> {
    const records = await db
      .select()
      .from(transcripts)
      .where(eq(transcripts.userId, userId))
      .orderBy(desc(transcripts.createdAt))
      .limit(limit);
    return records;
  }

  async getAllTranscripts(limit: number = 1000): Promise<any[]> {
    const records = await db
      .select()
      .from(transcripts)
      .orderBy(desc(transcripts.createdAt))
      .limit(limit);
    return records;
  }

  // Session operations
  async createUserSession(session: InsertUserSession): Promise<any> {
    const [result] = await db.insert(userSessions).values(session).returning();
    return result;
  }

  async getUserActiveSession(userId: number): Promise<any> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .where(eq(userSessions.isActive, true));
    return session || undefined;
  }

  async endUserSession(sessionId: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false, endTime: new Date() })
      .where(eq(userSessions.sessionId, sessionId));
  }
}

/**
 * @const {DatabaseStorage} storage
 * A singleton instance of the `DatabaseStorage` class.
 */
export const storage = new DatabaseStorage();
