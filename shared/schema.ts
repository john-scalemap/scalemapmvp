import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  companyName: varchar("company_name"),
  industry: varchar("industry"),
  revenue: varchar("revenue"),
  teamSize: integer("team_size"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assessment status enum
export const assessmentStatusEnum = pgEnum("assessment_status", [
  "pending",
  "in_progress", 
  "awaiting_payment",
  "paid",
  "analysis",
  "completed",
  "failed"
]);

// Assessments table
export const assessments = pgTable("assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: assessmentStatusEnum("status").notNull().default("pending"),
  progress: integer("progress").default(0),
  questionsAnswered: integer("questions_answered").default(0),
  totalQuestions: integer("total_questions").default(120),
  documentsUploaded: integer("documents_uploaded").default(0),
  executiveSummaryPath: varchar("executive_summary_path"),
  detailedAnalysisPath: varchar("detailed_analysis_path"),
  implementationKitPath: varchar("implementation_kit_path"),
  paymentIntentId: varchar("payment_intent_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("GBP"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Domain health enum
export const domainHealthEnum = pgEnum("domain_health", [
  "critical",
  "warning", 
  "good",
  "excellent"
]);

// Assessment domains table
export const assessmentDomains = pgTable("assessment_domains", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => assessments.id),
  domainName: varchar("domain_name").notNull(),
  score: decimal("score", { precision: 3, scale: 1 }),
  health: domainHealthEnum("health"),
  summary: text("summary"),
  recommendations: text("recommendations"),
  agentId: varchar("agent_id").references(() => agents.id),
  analysisComplete: boolean("analysis_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// AI Agents table
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  specialty: varchar("specialty").notNull(),
  background: text("background"),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").default(true),
  expertise: text("expertise"),
  experience: text("experience"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assessment responses table
export const assessmentResponses = pgTable("assessment_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => assessments.id),
  domainName: varchar("domain_name").notNull(),
  questionId: varchar("question_id").notNull(),
  response: text("response"),
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => assessments.id),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type"),
  objectPath: varchar("object_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Assessment Questions table
export const assessmentQuestions = pgTable("assessment_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domainName: varchar("domain_name").notNull(),
  questionId: varchar("question_id").notNull(),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type").default("core"), // core, industry_specific, follow_up
  industry: varchar("industry"), // null for core questions, specific industry for branching
  orderIndex: integer("order_index").notNull(),
  options: jsonb("options").notNull(), // JSON array of answer options with scores
  followUpLogic: jsonb("follow_up_logic"), // JSON defining follow-up question conditions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Analysis Jobs table
export const analysisJobs = pgTable("analysis_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().references(() => assessments.id),
  domainName: varchar("domain_name").notNull(),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  status: varchar("status").notNull().default("queued"), // queued, processing, completed, failed
  prompt: text("prompt"),
  response: text("response"),
  tokensUsed: integer("tokens_used"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  user: one(users, {
    fields: [assessments.userId],
    references: [users.id],
  }),
  domains: many(assessmentDomains),
  responses: many(assessmentResponses),
  documents: many(documents),
  analysisJobs: many(analysisJobs),
}));

export const assessmentDomainsRelations = relations(assessmentDomains, ({ one }) => ({
  assessment: one(assessments, {
    fields: [assessmentDomains.assessmentId],
    references: [assessments.id],
  }),
  agent: one(agents, {
    fields: [assessmentDomains.agentId],
    references: [agents.id],
  }),
}));

export const agentsRelations = relations(agents, ({ many }) => ({
  domains: many(assessmentDomains),
  analysisJobs: many(analysisJobs),
}));

export const analysisJobsRelations = relations(analysisJobs, ({ one }) => ({
  assessment: one(assessments, {
    fields: [analysisJobs.assessmentId],
    references: [assessments.id],
  }),
  agent: one(agents, {
    fields: [analysisJobs.agentId],
    references: [agents.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  companyName: true,
  industry: true,
  revenue: true,
  teamSize: true,
});

export const insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssessmentResponseSchema = createInsertSchema(assessmentResponses).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertQuestionSchema = createInsertSchema(assessmentQuestions).omit({
  id: true,
  createdAt: true,
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type AssessmentDomain = typeof assessmentDomains.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type AssessmentResponse = typeof assessmentResponses.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type AnalysisJob = typeof analysisJobs.$inferSelect;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type InsertAssessmentResponse = z.infer<typeof insertAssessmentResponseSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
