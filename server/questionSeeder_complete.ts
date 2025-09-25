import { storage } from "./storage";
import type { InsertQuestion } from "@shared/schema";

// Complete 120-question database (12 domains × 10 questions each)
const ASSESSMENT_QUESTIONS: InsertQuestion[] = [
  // Domain 1: Strategic Alignment (10 questions)
  {
    domainName: "Strategic Alignment",
    questionId: "1.1",
    questionText: "How clearly can your leadership team articulate your company's 3-year vision in one sentence?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Crystal clear - everyone gives the same answer", value: 1 },
      { text: "Mostly clear - minor variations in wording", value: 2 },
      { text: "Somewhat clear - general alignment but different emphases", value: 3 },
      { text: "Unclear - significant variations in interpretation", value: 4 },
      { text: "No clear vision - leadership gives contradictory answers", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.2",
    questionText: "When making resource allocation decisions, how often do teams reference strategic priorities?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Always - every major decision includes strategic impact analysis", value: 1 },
      { text: "Usually - strategic considerations are standard part of decisions", value: 2 },
      { text: "Sometimes - strategic alignment happens for bigger decisions", value: 3 },
      { text: "Rarely - decisions made mostly on operational needs", value: 4 },
      { text: "Never - strategic priorities don't influence day-to-day resource allocation", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.3",
    questionText: "How well do individual team goals connect to company-wide objectives?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Perfect alignment - every team goal clearly traces to strategic objectives", value: 1 },
      { text: "Strong alignment - most goals connect with clear reasoning", value: 2 },
      { text: "Moderate alignment - connections exist but aren't always clear", value: 3 },
      { text: "Weak alignment - some teams have goals unrelated to strategy", value: 4 },
      { text: "No alignment - team goals set independently of strategic objectives", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.4",
    questionText: "How accurately does your leadership team assess your competitive position?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Highly accurate - deep market intelligence informs all strategic decisions", value: 1 },
      { text: "Mostly accurate - good understanding with minor blind spots", value: 2 },
      { text: "Reasonably accurate - understanding is correct but not comprehensive", value: 3 },
      { text: "Somewhat inaccurate - significant gaps in competitive intelligence", value: 4 },
      { text: "Highly inaccurate - leadership operates with poor market understanding", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.5",
    questionText: "How often does leadership communicate strategic updates to the organization?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Weekly - consistent strategic context in regular communications", value: 1 },
      { text: "Monthly - regular strategic updates with clear progress tracking", value: 2 },
      { text: "Quarterly - strategic communication tied to business cycles", value: 3 },
      { text: "Semi-annually - strategic updates happen but infrequently", value: 4 },
      { text: "Annually or less - minimal strategic communication to teams", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.6",
    questionText: "How effectively do you measure progress against strategic objectives?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Comprehensive measurement - detailed KPIs with regular strategic reviews", value: 1 },
      { text: "Good measurement - solid metrics with quarterly strategic assessments", value: 2 },
      { text: "Basic measurement - some tracking but inconsistent strategic evaluation", value: 3 },
      { text: "Poor measurement - limited metrics for strategic progress", value: 4 },
      { text: "No measurement - operating without strategic progress tracking", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.7",
    questionText: "How well do you adapt strategy based on market feedback and results?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Highly adaptive - rapid strategic pivots based on market data", value: 1 },
      { text: "Well adaptive - structured approach to strategic adjustments", value: 2 },
      { text: "Moderately adaptive - some strategic changes but slow implementation", value: 3 },
      { text: "Poorly adaptive - limited strategic adjustments despite market signals", value: 4 },
      { text: "Not adaptive - strategy remains static regardless of market feedback", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.8",
    questionText: "How effectively do you cascade strategic priorities throughout the organization?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "Excellent cascading - all levels understand and execute strategic priorities", value: 1 },
      { text: "Good cascading - most teams understand and align with strategy", value: 2 },
      { text: "Basic cascading - senior teams aligned but gaps at operational levels", value: 3 },
      { text: "Poor cascading - strategy poorly communicated and understood", value: 4 },
      { text: "No cascading - strategic priorities remain at leadership level only", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.9",
    questionText: "How well do you manage strategic trade-offs and competing priorities?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Excellent trade-off management - clear frameworks for strategic decisions", value: 1 },
      { text: "Good trade-off management - structured approach to competing priorities", value: 2 },
      { text: "Basic trade-off management - some process for priority decisions", value: 3 },
      { text: "Poor trade-off management - ad hoc decisions without clear criteria", value: 4 },
      { text: "No trade-off management - strategic conflicts unresolved and confusing", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Strategic Alignment",
    questionId: "1.10",
    questionText: "How well positioned is your strategy for long-term competitive advantage?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Highly positioned - strategy creates sustainable competitive moats", value: 1 },
      { text: "Well positioned - strategy provides clear competitive advantages", value: 2 },
      { text: "Adequately positioned - strategy maintains competitive parity", value: 3 },
      { text: "Poorly positioned - strategy provides limited competitive advantage", value: 4 },
      { text: "Not positioned - strategy fails to create competitive differentiation", value: 5 }
    ],
    followUpLogic: null
  }
];

export async function seedAssessmentQuestions(): Promise<void> {
  try {
    console.log("Seeding complete 120 assessment questions...");
    await storage.seedQuestions(ASSESSMENT_QUESTIONS);
    console.log(`Successfully seeded ${ASSESSMENT_QUESTIONS.length} assessment questions`);
  } catch (error) {
    console.error("Error seeding questions:", error);
    throw error;
  }
}

export async function initializeQuestions(): Promise<void> {
  try {
    const existingQuestions = await storage.getAllQuestions();
    if (existingQuestions.length === 0) {
      await seedAssessmentQuestions();
    } else {
      console.log(`Assessment questions already initialized: ${existingQuestions.length} questions found`);
    }
  } catch (error) {
    console.error("Error initializing questions:", error);
  }
}