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

// Storage interface for backward compatibility
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Stage and system prompt queries
  getStageById(id: number): Promise<any>;
  getSystemPromptByStage(stageId: number): Promise<any>;
  getAdminDocumentsByStage(stageId: number): Promise<any>;
  
  // Stage movement tracking
  getUserCurrentStage(userId: number): Promise<any>;
  recordStageMovement(movement: InsertStageMovement): Promise<any>;
  
  // Transcript storage
  saveTranscript(transcript: InsertTranscript): Promise<any>;
  getUserTranscripts(userId: number, limit?: number): Promise<any[]>;
  
  // Session management
  createUserSession(session: InsertUserSession): Promise<any>;
  getUserActiveSession(userId: number): Promise<any>;
  endUserSession(sessionId: string): Promise<void>;
}

// DatabaseStorage implementation
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

export const storage = new DatabaseStorage();
