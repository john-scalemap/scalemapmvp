import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./cognitoAuth";
import {
  S3ObjectStorageService,
  S3ObjectNotFoundError,
} from "./s3Storage";
import { ObjectPermission } from "./objectAcl";
import { pool } from "./db";
import Stripe from "stripe";
import { 
  analyzeDomain, 
  generateExecutiveSummary, 
  performTriageAnalysis,
  OPERATIONAL_DOMAINS,
  AI_AGENTS
} from "./openai";
import { insertAssessmentResponseSchema, insertDocumentSchema } from "@shared/schema";
import { initializeQuestions } from "./questionSeeder";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.get('/api/health', async (req, res) => {
    const services: Record<string, string> = {};
    let isHealthy = true;

    try {
      await pool.query('SELECT 1');
      services.db = 'up';
    } catch (error) {
      services.db = 'down';
      isHealthy = false;
    }

    try {
      const s3StorageService = new S3ObjectStorageService();
      services.s3 = 'up';
    } catch (error) {
      services.s3 = 'down';
      isHealthy = false;
    }

    services.cognito = 'up';

    if (isHealthy) {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services
      });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Initialize AI agents in database
  await initializeAgents();

  // Initialize assessment questions in database
  await initializeQuestions();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile routes
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { companyName, industry, revenue, teamSize } = req.body;
      
      const user = await storage.upsertUser({
        id: userId,
        email: req.user.claims.email,
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
        companyName,
        industry,
        revenue,
        teamSize,
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Assessment routes
  app.post('/api/assessments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get actual question count from database
      const allQuestions = await storage.getAllQuestions();
      const totalQuestions = allQuestions.length;

      const assessment = await storage.createAssessment({
        userId,
        status: "in_progress",
        totalQuestions,
        amount: "7500.00", // £7,500
        currency: "GBP",
      });

      res.json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);
      res.status(500).json({ message: "Failed to create assessment" });
    }
  });

  app.get('/api/assessments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assessmentId = req.params.id;
      
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const domains = await storage.getAssessmentDomains(assessmentId);
      const documents = await storage.getAssessmentDocuments(assessmentId);
      
      res.json({ 
        ...assessment, 
        domains,
        documents,
        operationalDomains: OPERATIONAL_DOMAINS,
        availableAgents: AI_AGENTS 
      });
    } catch (error) {
      console.error("Error fetching assessment:", error);
      res.status(500).json({ message: "Failed to fetch assessment" });
    }
  });

  app.get('/api/assessments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assessments = await storage.getUserAssessments(userId);
      res.json(assessments);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      res.status(500).json({ message: "Failed to fetch assessments" });
    }
  });

  // Assessment response routes
  app.get('/api/assessments/:id/responses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assessmentId = req.params.id;

      // Verify assessment belongs to user
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const responses = await storage.getAssessmentResponses(assessmentId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  app.post('/api/assessments/:id/responses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assessmentId = req.params.id;
      const responses = req.body.responses; // Array of responses

      // Verify assessment belongs to user
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      // Save responses
      const savedResponses = [];
      for (const response of responses) {
        const validatedResponse = insertAssessmentResponseSchema.parse({
          assessmentId,
          domainName: response.domainName,
          questionId: response.questionId,
          response: response.response,
          score: response.score,
        });

        const saved = await storage.saveAssessmentResponse(validatedResponse);
        savedResponses.push(saved);
      }

      // Update assessment progress using actual total questions
      const totalResponses = await storage.getAssessmentResponses(assessmentId);
      const progress = Math.min(100, Math.round((totalResponses.length / (assessment.totalQuestions || 1)) * 100));

      await storage.updateAssessmentProgress(
        assessmentId,
        progress,
        totalResponses.length
      );

      // Ensure status is in_progress if responses are being saved
      if (assessment.status === 'pending') {
        await storage.updateAssessmentStatus(assessmentId, "in_progress", progress);
      }

      // If questionnaire is complete, check payment status before starting analysis
      if (progress >= 100) {
        const currentAssessment = await storage.getAssessment(assessmentId);
        if (currentAssessment?.status === 'paid') {
          // Both payment and questionnaire are complete - start analysis
          await storage.updateAssessmentStatus(assessmentId, "analysis", 100);

          // Start AI analysis process
          setTimeout(() => startAnalysisProcess(assessmentId), 1000);
          console.log(`Started analysis for assessment ${assessmentId} - payment and questionnaire complete`);
        } else {
          // Questionnaire complete but payment not received - set status to awaiting_payment
          await storage.updateAssessmentStatus(assessmentId, "awaiting_payment", 100);
          console.log(`Questionnaire complete for ${assessmentId}, awaiting payment`);
        }
      }

      res.json({ responses: savedResponses, progress });
    } catch (error) {
      console.error("Error saving responses:", error);
      res.status(500).json({ message: "Failed to save responses" });
    }
  });

  // Document upload routes
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const s3StorageService = new S3ObjectStorageService();
    const uploadURL = await s3StorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.post('/api/assessments/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assessmentId = req.params.id;
      const { fileName, fileSize, fileType, uploadURL } = req.body;

      // Verify assessment belongs to user
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const s3StorageService = new S3ObjectStorageService();
      const objectPath = s3StorageService.normalizeObjectEntityPath(uploadURL);

      // Set ACL policy for the uploaded document
      await s3StorageService.trySetObjectEntityAclPolicy(uploadURL, {
        owner: userId,
        visibility: "private",
      });

      // Save document record
      const document = await storage.saveDocument({
        assessmentId,
        fileName,
        fileSize,
        fileType,
        objectPath,
      });

      // Update document counter
      const documents = await storage.getAssessmentDocuments(assessmentId);
      await storage.updateAssessment(assessmentId, {
        documentsUploaded: documents.length
      });

      res.json(document);
    } catch (error) {
      console.error("Error saving document:", error);
      res.status(500).json({ message: "Failed to save document" });
    }
  });

  // Serve private documents
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const s3StorageService = new S3ObjectStorageService();
    try {
      const objectFile = await s3StorageService.getObjectEntityFile(req.path);
      const canAccess = await s3StorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      s3StorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof S3ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Payment routes
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { assessmentId } = req.body;
      const userId = req.user.claims.sub;

      // Verify assessment belongs to user
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const amount = 750000; // £7,500 in pence
      const amountDecimal = "7500.00"; // Store as decimal for consistency

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "gbp",
        metadata: {
          assessmentId,
          userId,
        },
      });

      // Store payment intent ID in assessment
      await storage.updateAssessmentPayment(assessmentId, paymentIntent.id, amountDecimal);

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook handler - raw body handled in index.ts
  app.post('/api/stripe-webhook', (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      // For sandbox testing, we'll skip signature verification
      // In production, add STRIPE_WEBHOOK_SECRET and use stripe.webhooks.constructEvent
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.error(`Webhook signature verification failed:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Respond immediately to avoid Stripe timeout
    res.status(200).json({ received: true });

    // Process webhook asynchronously
    setImmediate(async () => {
      try {
        switch (event.type) {
          case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const { assessmentId, userId } = paymentIntent.metadata;

            if (assessmentId && userId) {
              console.log(`Payment succeeded for assessment ${assessmentId}, user ${userId}`);
              
              // Update assessment status to indicate payment received
              await storage.updateAssessmentStatus(assessmentId, 'paid');
              
              // Check if questionnaire is complete before starting analysis
              const assessment = await storage.getAssessment(assessmentId);
              if (assessment && assessment.questionsAnswered && assessment.totalQuestions && assessment.questionsAnswered >= assessment.totalQuestions) {
                console.log(`Starting analysis for completed assessment ${assessmentId}`);
                startAnalysisProcess(assessmentId).catch(error => {
                  console.error(`Error starting analysis for ${assessmentId}:`, error);
                });
              } else {
                console.log(`Payment received for ${assessmentId}, waiting for questionnaire completion`);
              }
            }
            break;
          }
          case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const { assessmentId } = paymentIntent.metadata;
            
            if (assessmentId) {
              console.log(`Payment failed for assessment ${assessmentId}`);
              await storage.updateAssessmentStatus(assessmentId, 'failed');
            }
            break;
          }
          default:
            console.log(`Unhandled event type: ${event.type}`);
        }
      } catch (error) {
        console.error('Error processing webhook:', error);
      }
    });
  });

  // AI Analysis routes
  app.get('/api/agents', async (req, res) => {
    try {
      const agents = await storage.getActiveAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Analysis status route
  app.get('/api/assessments/:id/analysis', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assessmentId = req.params.id;
      
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment || assessment.userId !== userId) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const domains = await storage.getAssessmentDomains(assessmentId);
      const analysisJobs = await storage.getAnalysisJobs(assessmentId);
      
      // Calculate analysis progress
      const totalJobs = analysisJobs.length;
      const completedJobs = analysisJobs.filter(job => job.status === 'completed').length;
      const analysisProgress = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

      res.json({
        assessment,
        domains,
        analysisJobs,
        analysisProgress,
      });
    } catch (error) {
      console.error("Error fetching analysis status:", error);
      res.status(500).json({ message: "Failed to fetch analysis status" });
    }
  });

  // Questions routes  
  app.get('/api/questions/:domain', async (req, res) => {
    try {
      const domainName = req.params.domain;
      const industry = req.query.industry as string;
      
      const questions = await storage.getQuestionsByDomain(domainName, industry);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.get('/api/questions', async (req, res) => {
    try {
      const questions = await storage.getAllQuestions();
      res.json(questions);
    } catch (error) {
      console.error("Error fetching all questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to initialize AI agents in database
async function initializeAgents() {
  try {
    const existingAgents = await storage.getAllAgents();
    if (existingAgents.length === 0) {
      console.log("Initializing AI agents...");
      const { AGENT_SEED_DATA } = await import('./agentSeeder');
      await storage.seedAgents(AGENT_SEED_DATA);
      console.log(`Successfully initialized ${AGENT_SEED_DATA.length} AI specialist agents`);
    } else {
      console.log(`Found ${existingAgents.length} existing agents in database`);
    }
  } catch (error) {
    console.error("Error initializing agents:", error);
  }
}

// Background analysis process
async function startAnalysisProcess(assessmentId: string) {
  try {
    console.log(`Starting analysis for assessment ${assessmentId}`);
    
    const assessment = await storage.getAssessment(assessmentId);
    if (!assessment) return;

    const user = await storage.getUser(assessment.userId);
    if (!user) return;

    const responses = await storage.getAssessmentResponses(assessmentId);
    const documents = await storage.getAssessmentDocuments(assessmentId);

    const companyContext = {
      companyName: user.companyName || "Company",
      industry: user.industry || "Technology",
      revenue: user.revenue || "1M-10M",
      teamSize: user.teamSize || 50,
    };

    // Perform triage analysis
    const triage = await performTriageAnalysis(responses, companyContext);
    
    // Analyze priority domains
    const domainAnalyses = [];
    for (const domainName of triage.priorityDomains.slice(0, 5)) {
      try {
        const analysis = await analyzeDomain(
          domainName,
          responses,
          documents,
          companyContext
        );

        await storage.updateDomainAnalysis(
          assessmentId,
          domainName,
          analysis.score,
          analysis.health,
          analysis.summary
        );

        domainAnalyses.push({
          domainName,
          score: analysis.score,
          health: analysis.health,
          summary: analysis.summary,
        });
      } catch (error) {
        console.error(`Error analyzing domain ${domainName}:`, error);
      }
    }

    // Generate executive summary
    const executiveSummary = await generateExecutiveSummary(domainAnalyses, companyContext);
    
    // Update assessment as completed
    await storage.updateAssessmentStatus(assessmentId, "completed", 100);
    
    console.log(`Analysis completed for assessment ${assessmentId}`);
  } catch (error) {
    console.error(`Error in analysis process for ${assessmentId}:`, error);
    await storage.updateAssessmentStatus(assessmentId, "failed");
  }
}
