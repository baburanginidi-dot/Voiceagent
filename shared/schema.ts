import { pgTable, serial, varchar, text, timestamp, integer, boolean, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - store user information
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('users_phone_idx').on(table.phoneNumber),
]);

// Stages table - store different stage levels
export const stages = pgTable('stages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  level: integer('level').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('stages_level_idx').on(table.level),
]);

// System Prompts table - store AI behavior prompts for each stage
export const systemPrompts = pgTable('system_prompts', {
  id: serial('id').primaryKey(),
  stageId: integer('stage_id').references(() => stages.id, { onDelete: 'cascade' }).notNull(),
  prompt: text('prompt').notNull(),
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('system_prompts_stage_idx').on(table.stageId),
]);

// Admin Documents table - documents uploaded by admin that influence AI behavior
export const adminDocuments = pgTable('admin_documents', {
  id: serial('id').primaryKey(),
  stageId: integer('stage_id').references(() => stages.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(), // 'guideline', 'context', 'product_info', etc.
  uploadedBy: varchar('uploaded_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('admin_documents_stage_idx').on(table.stageId),
]);

// Stage Movements table - track user progression through stages
export const stageMovements = pgTable('stage_movements', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  previousStageId: integer('previous_stage_id').references(() => stages.id, { onDelete: 'set null' }),
  currentStageId: integer('current_stage_id').references(() => stages.id, { onDelete: 'cascade' }).notNull(),
  reason: varchar('reason', { length: 255 }), // 'payment_selection', 'completion', 'manual_admin_change', etc.
  metadata: jsonb('metadata'), // Store additional context about the movement
  movedAt: timestamp('moved_at').defaultNow().notNull(),
}, (table) => [
  index('stage_movements_user_idx').on(table.userId),
  index('stage_movements_current_stage_idx').on(table.currentStageId),
  index('stage_movements_moved_at_idx').on(table.movedAt),
]);

// Transcripts table - store conversation transcripts
export const transcripts = pgTable('transcripts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  stageId: integer('stage_id').references(() => stages.id, { onDelete: 'cascade' }).notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(), // Track unique conversations
  userMessage: text('user_message').notNull(),
  aiResponse: text('ai_response').notNull(),
  audioUrl: varchar('audio_url', { length: 500 }), // Store reference to audio if available
  duration: integer('duration'), // Duration in seconds
  metadata: jsonb('metadata'), // Store additional context like confidence, intent, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('transcripts_user_idx').on(table.userId),
  index('transcripts_stage_idx').on(table.stageId),
  index('transcripts_session_idx').on(table.sessionId),
  index('transcripts_created_at_idx').on(table.createdAt),
]);

// User Sessions table - track user login sessions and progress
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  stageId: integer('stage_id').references(() => stages.id, { onDelete: 'cascade' }).notNull(),
  sessionId: varchar('session_id', { length: 255 }).unique().notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'), // Store context like device, location, etc.
}, (table) => [
  index('user_sessions_user_idx').on(table.userId),
  index('user_sessions_active_idx').on(table.isActive),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  stageMovements: many(stageMovements),
  transcripts: many(transcripts),
  sessions: many(userSessions),
}));

export const stagesRelations = relations(stages, ({ many }) => ({
  systemPrompts: many(systemPrompts),
  adminDocuments: many(adminDocuments),
  stageMovements: many(stageMovements),
  transcripts: many(transcripts),
}));

export const systemPromptsRelations = relations(systemPrompts, ({ one }) => ({
  stage: one(stages, {
    fields: [systemPrompts.stageId],
    references: [stages.id],
  }),
}));

export const adminDocumentsRelations = relations(adminDocuments, ({ one }) => ({
  stage: one(stages, {
    fields: [adminDocumentsRelations.stageId],
    references: [stages.id],
  }),
}));

export const stageMovementsRelations = relations(stageMovements, ({ one }) => ({
  user: one(users, {
    fields: [stageMovements.userId],
    references: [users.id],
  }),
  currentStage: one(stages, {
    fields: [stageMovements.currentStageId],
    references: [stages.id],
  }),
  previousStage: one(stages, {
    fields: [stageMovements.previousStageId],
    references: [stages.id],
  }),
}));

export const transcriptsRelations = relations(transcripts, ({ one }) => ({
  user: one(users, {
    fields: [transcripts.userId],
    references: [users.id],
  }),
  stage: one(stages, {
    fields: [transcripts.stageId],
    references: [stages.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
  stage: one(stages, {
    fields: [userSessions.stageId],
    references: [stages.id],
  }),
}));

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Stage = typeof stages.$inferSelect;
export type InsertStage = typeof stages.$inferInsert;

export type SystemPrompt = typeof systemPrompts.$inferSelect;
export type InsertSystemPrompt = typeof systemPrompts.$inferInsert;

export type AdminDocument = typeof adminDocuments.$inferSelect;
export type InsertAdminDocument = typeof adminDocuments.$inferInsert;

export type StageMovement = typeof stageMovements.$inferSelect;
export type InsertStageMovement = typeof stageMovements.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type InsertTranscript = typeof transcripts.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
