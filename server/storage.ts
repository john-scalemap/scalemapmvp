import {
  users,
  assessments,
  assessmentDomains,
  agents,
  assessmentResponses,
  documents,
  analysisJobs,
  assessmentQuestions,
  type User,
  type UpsertUser,
  type Assessment,
  type AssessmentDomain,
  type Agent,
  type AssessmentResponse,
  type Document,
  type AnalysisJob,
  type AssessmentQuestion,
  type InsertAssessment,
  type InsertAssessmentResponse,
  type InsertDocument,
  type InsertQuestion,
  type InsertAgent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateStripeCustomerId(userId: string, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: string, info: { customerId: string; subscriptionId: string }): Promise<User>;
  
  // Assessment operations
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  getAssessment(id: string): Promise<Assessment | undefined>;
  getUserAssessments(userId: string): Promise<Assessment[]>;
  updateAssessmentStatus(id: string, status: string, progress?: number): Promise<Assessment>;
  updateAssessmentProgress(id: string, progress: number, questionsAnswered?: number): Promise<Assessment>;
  updateAssessmentPayment(assessmentId: string, paymentIntentId: string, amount: string): Promise<Assessment>;
  updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment>;
  updateAssessmentAnalysis(id: string, analysisData: Record<string, any>): Promise<Assessment>;
  
  // Domain operations
  getAssessmentDomains(assessmentId: string): Promise<AssessmentDomain[]>;
  updateDomainAnalysis(assessmentId: string, domainName: string, score: number, health: string, summary: string): Promise<AssessmentDomain>;
  
  // Agent operations  
  getAllAgents(): Promise<Agent[]>;
  getActiveAgents(): Promise<Agent[]>;
  getAgentsBySpecialty(specialty: string): Promise<Agent[]>;
  seedAgents(agents: InsertAgent[]): Promise<void>;
  
  // Response operations
  saveAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse>;
  getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]>;
  
  // Document operations
  saveDocument(document: InsertDocument): Promise<Document>;
  getAssessmentDocuments(assessmentId: string): Promise<Document[]>;
  
  // Analysis job operations
  createAnalysisJob(assessmentId: string, domainName: string, agentId: string, prompt: string): Promise<AnalysisJob>;
  updateAnalysisJob(id: string, status: string, response?: string, tokensUsed?: number): Promise<AnalysisJob>;
  getAnalysisJobs(assessmentId: string): Promise<AnalysisJob[]>;
  
  // Question operations
  seedQuestions(questions: InsertQuestion[]): Promise<void>;
  getQuestionsByDomain(domainName: string, industry?: string): Promise<AssessmentQuestion[]>;
  getAllQuestions(): Promise<AssessmentQuestion[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, info: { customerId: string; subscriptionId: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        stripeCustomerId: info.customerId,
        stripeSubscriptionId: info.subscriptionId,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Assessment operations
  async createAssessment(assessment: InsertAssessment): Promise<Assessment> {
    const [newAssessment] = await db
      .insert(assessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async getAssessment(id: string): Promise<Assessment | undefined> {
    const [assessment] = await db
      .select()
      .from(assessments)
      .where(eq(assessments.id, id));
    return assessment;
  }

  async getUserAssessments(userId: string): Promise<Assessment[]> {
    return await db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.createdAt));
  }

  async updateAssessmentStatus(id: string, status: string, progress?: number): Promise<Assessment> {
    const updateData: any = { status, updatedAt: new Date() };
    if (progress !== undefined) {
      updateData.progress = progress;
    }
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const [assessment] = await db
      .update(assessments)
      .set(updateData)
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async updateAssessmentProgress(id: string, progress: number, questionsAnswered?: number): Promise<Assessment> {
    const updateData: any = { progress, updatedAt: new Date() };
    if (questionsAnswered !== undefined) {
      updateData.questionsAnswered = questionsAnswered;
    }

    const [assessment] = await db
      .update(assessments)
      .set(updateData)
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async updateAssessmentPayment(assessmentId: string, paymentIntentId: string, amount: string): Promise<Assessment> {
    const [assessment] = await db
      .update(assessments)
      .set({
        paymentIntentId,
        amount,
        updatedAt: new Date()
      })
      .where(eq(assessments.id, assessmentId))
      .returning();
    return assessment;
  }

  async updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment> {
    // Remove fields that shouldn't be directly updated
    const { id: _, createdAt, ...safeUpdates } = updates as any;

    const [assessment] = await db
      .update(assessments)
      .set({
        ...safeUpdates,
        updatedAt: new Date()
      })
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async updateAssessmentAnalysis(id: string, analysisData: Record<string, any>): Promise<Assessment> {
    // This method is for updating analysis-specific fields
    // Since assessments table doesn't have these fields, we'll update what we can
    const updateData: any = { updatedAt: new Date() };

    // Map analysis data to assessment fields if they exist
    if (analysisData.triageCompleted !== undefined) {
      updateData.progress = analysisData.triageCompleted ? 25 : updateData.progress;
    }
    if (analysisData.executiveSummaryComplete !== undefined || analysisData.executiveSummaryPath !== undefined) {
      updateData.executiveSummaryPath = analysisData.executiveSummaryPath;
    }
    if (analysisData.detailedAnalysisComplete !== undefined || analysisData.detailedAnalysisPath !== undefined) {
      updateData.detailedAnalysisPath = analysisData.detailedAnalysisPath;
    }
    if (analysisData.implementationKitComplete !== undefined || analysisData.implementationKitPath !== undefined) {
      updateData.implementationKitPath = analysisData.implementationKitPath;
    }

    const [assessment] = await db
      .update(assessments)
      .set(updateData)
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  // Domain operations
  async getAssessmentDomains(assessmentId: string): Promise<(AssessmentDomain & { agentName?: string })[]> {
    const result = await db
      .select({
        id: assessmentDomains.id,
        createdAt: assessmentDomains.createdAt,
        updatedAt: assessmentDomains.updatedAt,
        assessmentId: assessmentDomains.assessmentId,
        domainName: assessmentDomains.domainName,
        score: assessmentDomains.score,
        health: assessmentDomains.health,
        summary: assessmentDomains.summary,
        recommendations: assessmentDomains.recommendations,
        agentId: assessmentDomains.agentId,
        analysisComplete: assessmentDomains.analysisComplete,
        agentName: agents.name ?? undefined
      })
      .from(assessmentDomains)
      .leftJoin(agents, eq(assessmentDomains.agentId, agents.id))
      .where(eq(assessmentDomains.assessmentId, assessmentId));

    return result.map(row => ({
      ...row,
      agentName: row.agentName || undefined
    }));
  }

  async updateDomainAnalysis(assessmentId: string, domainName: string, score: number, health: string, summary: string): Promise<AssessmentDomain> {
    // First, try to update existing domain
    const [existingDomain] = await db
      .select()
      .from(assessmentDomains)
      .where(and(
        eq(assessmentDomains.assessmentId, assessmentId),
        eq(assessmentDomains.domainName, domainName)
      ));

    if (existingDomain) {
      const [updatedDomain] = await db
        .update(assessmentDomains)
        .set({ 
          score: score.toString(),
          health: health as any,
          summary,
          analysisComplete: true,
          updatedAt: new Date()
        })
        .where(eq(assessmentDomains.id, existingDomain.id))
        .returning();
      return updatedDomain;
    } else {
      // Create new domain entry
      const [newDomain] = await db
        .insert(assessmentDomains)
        .values({
          assessmentId,
          domainName,
          score: score.toString(),
          health: health as any,
          summary,
          analysisComplete: true,
        })
        .returning();
      return newDomain;
    }
  }

  // Agent operations
  async getAllAgents(): Promise<Agent[]> {
    return await db.select().from(agents);
  }

  async getActiveAgents(): Promise<Agent[]> {
    return await db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true));
  }

  async getAgentsBySpecialty(specialty: string): Promise<Agent[]> {
    return await db
      .select()
      .from(agents)
      .where(and(
        eq(agents.specialty, specialty),
        eq(agents.isActive, true)
      ));
  }

  async seedAgents(agentData: InsertAgent[]): Promise<void> {
    await db.insert(agents).values(agentData).onConflictDoNothing();
  }

  // Response operations
  async saveAssessmentResponse(response: InsertAssessmentResponse): Promise<AssessmentResponse> {
    const [newResponse] = await db
      .insert(assessmentResponses)
      .values(response)
      .returning();
    return newResponse;
  }

  async getAssessmentResponses(assessmentId: string): Promise<AssessmentResponse[]> {
    return await db
      .select()
      .from(assessmentResponses)
      .where(eq(assessmentResponses.assessmentId, assessmentId));
  }

  // Document operations
  async saveDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async getAssessmentDocuments(assessmentId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.assessmentId, assessmentId));
  }

  // Analysis job operations
  async createAnalysisJob(assessmentId: string, domainName: string, agentId: string, prompt: string): Promise<AnalysisJob> {
    const [job] = await db
      .insert(analysisJobs)
      .values({
        assessmentId,
        domainName,
        agentId,
        prompt,
        status: "queued",
      })
      .returning();
    return job;
  }

  async updateAnalysisJob(id: string, status: string, response?: string, tokensUsed?: number): Promise<AnalysisJob> {
    const updateData: any = { status };
    if (response) updateData.response = response;
    if (tokensUsed) updateData.tokensUsed = tokensUsed;
    if (status === 'processing') updateData.startedAt = new Date();
    if (status === 'completed' || status === 'failed') updateData.completedAt = new Date();

    const [job] = await db
      .update(analysisJobs)
      .set(updateData)
      .where(eq(analysisJobs.id, id))
      .returning();
    return job;
  }

  async getAnalysisJobs(assessmentId: string): Promise<AnalysisJob[]> {
    return await db
      .select()
      .from(analysisJobs)
      .where(eq(analysisJobs.assessmentId, assessmentId))
      .orderBy(desc(analysisJobs.createdAt));
  }

  // Question operations
  async seedQuestions(questions: InsertQuestion[]): Promise<void> {
    await db.insert(assessmentQuestions).values(questions).onConflictDoNothing();
  }

  async getQuestionsByDomain(domainName: string, industry?: string): Promise<AssessmentQuestion[]> {
    if (industry) {
      return await db
        .select()
        .from(assessmentQuestions)
        .where(
          and(
            eq(assessmentQuestions.domainName, domainName),
            eq(assessmentQuestions.isActive, true),
            eq(assessmentQuestions.industry, industry)
          )
        )
        .orderBy(assessmentQuestions.orderIndex);
    } else {
      return await db
        .select()
        .from(assessmentQuestions)
        .where(
          and(
            eq(assessmentQuestions.domainName, domainName),
            eq(assessmentQuestions.isActive, true)
          )
        )
        .orderBy(assessmentQuestions.orderIndex);
    }
  }

  async getAllQuestions(): Promise<AssessmentQuestion[]> {
    return await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.isActive, true))
      .orderBy(assessmentQuestions.domainName, assessmentQuestions.orderIndex);
  }

  // Delete operations for testing
  async deleteAssessment(id: string): Promise<void> {
    await db.delete(assessments).where(eq(assessments.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }
}

export const storage = new DatabaseStorage();
