import { storage } from "./storage";
import type { InsertQuestion } from "@shared/schema";

// Comprehensive question database based on assessment-questions-database.md
const ASSESSMENT_QUESTIONS: InsertQuestion[] = [
  // Domain 1: Strategic Alignment & Vision (expanding to 10 questions)
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
    followUpLogic: {
      conditions: [{ minScore: 4, followUpQuestions: ["vision_challenges", "vision_timeline"] }]
    }
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
    followUpLogic: {
      conditions: [{ minScore: 4, followUpQuestions: ["resource_drivers", "priority_conflicts"] }]
    }
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
  },

  // Domain 2: Financial Management
  {
    domainName: "Financial Management",
    questionId: "2.1",
    questionText: "How accurately can you predict monthly cash flow 3 months in advance?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Within 5% - highly predictable with robust forecasting models", value: 1 },
      { text: "Within 10% - good predictability with minor seasonal variations", value: 2 },
      { text: "Within 20% - reasonable accuracy but significant month-to-month variations", value: 3 },
      { text: "Within 30% - poor predictability making planning difficult", value: 4 },
      { text: "Cannot predict - cash flow highly volatile and unpredictable", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Financial Management",
    questionId: "2.2",
    questionText: "How detailed and scenario-based is your financial planning process?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Advanced - multiple scenarios with sensitivity analysis and Monte Carlo modeling", value: 1 },
      { text: "Sophisticated - base/optimistic/pessimistic scenarios with regular updates", value: 2 },
      { text: "Standard - annual budgets with quarterly reviews and basic scenario planning", value: 3 },
      { text: "Basic - simple budgets without scenario planning or regular updates", value: 4 },
      { text: "Minimal - reactive financial management without formal planning process", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Financial Management",
    questionId: "2.3",
    questionText: "How well does leadership understand unit economics across all business lines?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Expert level - granular unit economics drive all business decisions", value: 1 },
      { text: "Advanced level - strong understanding with regular optimization efforts", value: 2 },
      { text: "Good level - basic unit economics tracked but not consistently optimized", value: 3 },
      { text: "Basic level - limited understanding of true unit profitability", value: 4 },
      { text: "Poor level - operating without clear unit economics understanding", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 3: Revenue Engine
  {
    domainName: "Revenue Engine",
    questionId: "3.1",
    questionText: "How predictable is your sales pipeline and conversion rates?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Highly predictable - accurate forecasts with +/-5% variance", value: 1 },
      { text: "Mostly predictable - good visibility with +/-15% variance", value: 2 },
      { text: "Somewhat predictable - reasonable forecasts with +/-25% variance", value: 3 },
      { text: "Unpredictable - significant variance making planning difficult", value: 4 },
      { text: "Highly unpredictable - cannot reliably forecast revenue", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Revenue Engine",
    questionId: "3.2",
    questionText: "How well defined and documented are your sales processes?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Fully documented - standardized process with clear stage definitions", value: 1 },
      { text: "Well documented - most processes defined with regular updates", value: 2 },
      { text: "Partially documented - basic process outline but gaps in detail", value: 3 },
      { text: "Minimally documented - ad hoc processes with limited standardization", value: 4 },
      { text: "Not documented - sales team operates without defined processes", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 4: Operations Excellence
  {
    domainName: "Operations Excellence",
    questionId: "4.1",
    questionText: "How well optimized are your core business processes?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Highly optimized - continuous improvement with measurable efficiency gains", value: 1 },
      { text: "Well optimized - regular process reviews and improvements", value: 2 },
      { text: "Moderately optimized - some process improvement efforts", value: 3 },
      { text: "Poorly optimized - processes functional but inefficient", value: 4 },
      { text: "Not optimized - significant process bottlenecks and waste", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Operations Excellence",
    questionId: "4.2",
    questionText: "How effectively do you measure and track operational performance?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Comprehensive - real-time dashboards with leading indicators", value: 1 },
      { text: "Good - regular performance tracking with actionable metrics", value: 2 },
      { text: "Basic - some metrics tracked but limited analysis", value: 3 },
      { text: "Limited - minimal performance measurement", value: 4 },
      { text: "None - no systematic performance tracking", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 5: People & Organization
  {
    domainName: "People & Organization",
    questionId: "5.1",
    questionText: "How effectively does your organization scale team structures?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Excellent - proactive scaling with clear growth frameworks", value: 1 },
      { text: "Good - structured approach to team growth", value: 2 },
      { text: "Moderate - some planning for team expansion", value: 3 },
      { text: "Poor - reactive hiring without clear structure", value: 4 },
      { text: "Crisis mode - team structure cannot support current operations", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "People & Organization",
    questionId: "5.2",
    questionText: "How well does your organization develop and retain top talent?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Excellent - systematic development with high retention", value: 1 },
      { text: "Good - structured career paths and development programs", value: 2 },
      { text: "Moderate - some development efforts but inconsistent", value: 3 },
      { text: "Poor - limited development leading to talent drain", value: 4 },
      { text: "Critical - high turnover in key positions", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 6: Technology & Data (expanding to 10 questions)
  {
    domainName: "Technology & Data",
    questionId: "6.1",
    questionText: "How well does your technology infrastructure support business growth?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Highly scalable - technology enables rapid business growth", value: 1 },
      { text: "Well scaled - infrastructure supports current growth plans", value: 2 },
      { text: "Adequately scaled - technology meets current needs", value: 3 },
      { text: "Poorly scaled - technology constraints limit growth", value: 4 },
      { text: "Critical constraints - technology blocks business operations", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.2",
    questionText: "How effectively do you use data for business decision-making?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Data-driven - comprehensive analytics inform all major decisions", value: 1 },
      { text: "Analytics-informed - good data usage with room for improvement", value: 2 },
      { text: "Basic analytics - some data usage but not systematic", value: 3 },
      { text: "Limited data use - decisions mostly based on intuition", value: 4 },
      { text: "No data strategy - operating without meaningful business intelligence", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.3",
    questionText: "How secure is your data and technology infrastructure?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Enterprise-grade security - comprehensive security frameworks and compliance", value: 1 },
      { text: "Strong security - good security practices with regular audits", value: 2 },
      { text: "Adequate security - basic security measures in place", value: 3 },
      { text: "Weak security - minimal security measures, significant vulnerabilities", value: 4 },
      { text: "Poor security - major security gaps that pose business risk", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.4",
    questionText: "How well integrated are your technology systems and data flows?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Fully integrated - seamless data flow across all systems", value: 1 },
      { text: "Well integrated - most systems connected with minor gaps", value: 2 },
      { text: "Partially integrated - some systems connected, but manual processes remain", value: 3 },
      { text: "Poorly integrated - significant system silos and manual data transfer", value: 4 },
      { text: "Not integrated - isolated systems requiring extensive manual work", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.5",
    questionText: "How effectively do you manage and maintain your technology stack?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Proactive management - regular updates, monitoring, and optimization", value: 1 },
      { text: "Good management - structured maintenance with monitoring in place", value: 2 },
      { text: "Basic management - routine maintenance but limited optimization", value: 3 },
      { text: "Reactive management - maintenance happens when problems occur", value: 4 },
      { text: "Poor management - technology issues frequently disrupt operations", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.6",
    questionText: "How well do you leverage automation to improve efficiency?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Highly automated - comprehensive automation across all processes", value: 1 },
      { text: "Well automated - good automation coverage with ongoing expansion", value: 2 },
      { text: "Partially automated - some processes automated, others still manual", value: 3 },
      { text: "Minimally automated - limited automation, mostly manual processes", value: 4 },
      { text: "Not automated - all processes are manual and time-consuming", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.7",
    questionText: "How effectively do you backup and protect your business data?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Enterprise-level protection - comprehensive backup and disaster recovery", value: 1 },
      { text: "Strong protection - regular backups with tested recovery procedures", value: 2 },
      { text: "Basic protection - regular backups but limited disaster recovery testing", value: 3 },
      { text: "Weak protection - irregular backups with untested recovery", value: 4 },
      { text: "No protection - minimal or no backup strategy in place", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.8",
    questionText: "How well does your team utilize available technology tools?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "Expert utilization - team maximizes technology potential for productivity", value: 1 },
      { text: "Good utilization - team uses most features effectively", value: 2 },
      { text: "Basic utilization - team uses core features but misses optimization opportunities", value: 3 },
      { text: "Poor utilization - team struggles to use technology effectively", value: 4 },
      { text: "Minimal utilization - technology is underused, limiting productivity", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.9",
    questionText: "How well do you track and analyze business performance metrics?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Comprehensive analytics - real-time dashboards with actionable insights", value: 1 },
      { text: "Good analytics - regular reporting with clear performance tracking", value: 2 },
      { text: "Basic analytics - some metrics tracked but limited analysis", value: 3 },
      { text: "Poor analytics - minimal performance measurement and tracking", value: 4 },
      { text: "No analytics - operating without systematic performance measurement", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Technology & Data",
    questionId: "6.10",
    questionText: "How future-ready is your technology strategy for scaling?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Highly future-ready - technology strategy anticipates and enables growth", value: 1 },
      { text: "Well prepared - technology roadmap aligns with business growth plans", value: 2 },
      { text: "Adequately prepared - technology planning exists but limited future focus", value: 3 },
      { text: "Poorly prepared - technology strategy is reactive rather than strategic", value: 4 },
      { text: "Not prepared - no technology strategy for future growth", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 7: Customer Success
  {
    domainName: "Customer Success",
    questionId: "7.1",
    questionText: "How effectively do you onboard new customers for success?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Exceptional onboarding - comprehensive program ensuring customer success", value: 1 },
      { text: "Good onboarding - structured process with good success rates", value: 2 },
      { text: "Basic onboarding - standard process but room for improvement", value: 3 },
      { text: "Poor onboarding - minimal process leading to customer confusion", value: 4 },
      { text: "No onboarding - customers left to figure things out independently", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.2",
    questionText: "How well do you measure and track customer satisfaction?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Comprehensive tracking - multiple metrics with proactive intervention", value: 1 },
      { text: "Good tracking - regular surveys and feedback collection", value: 2 },
      { text: "Basic tracking - some satisfaction measurement but inconsistent", value: 3 },
      { text: "Poor tracking - minimal customer satisfaction measurement", value: 4 },
      { text: "No tracking - operating without customer satisfaction insights", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.3",
    questionText: "How effectively do you retain and grow existing customers?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Exceptional retention - high retention with strong expansion revenue", value: 1 },
      { text: "Good retention - above industry average with some expansion", value: 2 },
      { text: "Average retention - retention rates meet industry standards", value: 3 },
      { text: "Poor retention - below average retention impacting growth", value: 4 },
      { text: "Critical retention issues - high churn threatening business sustainability", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.4",
    questionText: "How proactively do you identify and address customer issues?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Highly proactive - predictive analytics identify issues before customers notice", value: 1 },
      { text: "Proactive - regular check-ins and monitoring prevent most issues", value: 2 },
      { text: "Somewhat proactive - some monitoring but mostly reactive responses", value: 3 },
      { text: "Reactive - wait for customers to report issues before acting", value: 4 },
      { text: "Crisis-driven - only address issues when they become critical", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.5",
    questionText: "How well do you understand and act on customer feedback?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Exceptional feedback integration - systematic collection and product development", value: 1 },
      { text: "Good feedback integration - regular collection with action plans", value: 2 },
      { text: "Basic feedback integration - collect feedback but limited action", value: 3 },
      { text: "Poor feedback integration - minimal collection and rare action", value: 4 },
      { text: "No feedback integration - operate without systematic customer input", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.6",
    questionText: "How effectively do you deliver ongoing value to customers?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Continuous value delivery - regular new benefits and optimization", value: 1 },
      { text: "Good value delivery - consistent value with periodic enhancements", value: 2 },
      { text: "Basic value delivery - deliver promised value but limited extras", value: 3 },
      { text: "Poor value delivery - struggle to maintain promised value", value: 4 },
      { text: "Inconsistent value - customers question the value they receive", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.7",
    questionText: "How well do you segment and personalize customer experiences?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Highly personalized - sophisticated segmentation with tailored experiences", value: 1 },
      { text: "Well personalized - good segmentation with customized approaches", value: 2 },
      { text: "Basic personalization - some segmentation but limited customization", value: 3 },
      { text: "Poor personalization - minimal segmentation, mostly one-size-fits-all", value: 4 },
      { text: "No personalization - identical experience for all customers", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.8",
    questionText: "How effectively do you handle customer support and service?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "Exceptional support - fast, knowledgeable, and proactive assistance", value: 1 },
      { text: "Good support - timely and helpful customer service", value: 2 },
      { text: "Basic support - adequate response times and problem resolution", value: 3 },
      { text: "Poor support - slow response times and limited problem-solving", value: 4 },
      { text: "Critical support issues - customers frequently frustrated with service", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.9",
    questionText: "How well do you educate and enable customer success?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Comprehensive education - extensive resources and training programs", value: 1 },
      { text: "Good education - helpful resources and regular training opportunities", value: 2 },
      { text: "Basic education - some resources available but limited engagement", value: 3 },
      { text: "Poor education - minimal resources and rare training opportunities", value: 4 },
      { text: "No education - customers must learn everything independently", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Customer Success",
    questionId: "7.10",
    questionText: "How well do you build long-term customer relationships?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Strong relationships - customers view you as strategic partners", value: 1 },
      { text: "Good relationships - customers trust and value the partnership", value: 2 },
      { text: "Basic relationships - transactional but positive interactions", value: 3 },
      { text: "Weak relationships - limited connection beyond transactions", value: 4 },
      { text: "Poor relationships - customers consider switching or have switched", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 8: Product Strategy
  {
    domainName: "Product Strategy",
    questionId: "8.1",
    questionText: "How well defined is your product strategy and roadmap?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Highly defined - comprehensive strategy with clear 2-3 year roadmap", value: 1 },
      { text: "Well defined - good strategy with 12-18 month roadmap", value: 2 },
      { text: "Moderately defined - basic strategy with 6-12 month planning", value: 3 },
      { text: "Poorly defined - limited strategy with short-term planning", value: 4 },
      { text: "Undefined - reactive product development without strategy", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.2",
    questionText: "How effectively do you gather and prioritize product requirements?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Systematic prioritization - comprehensive framework with stakeholder input", value: 1 },
      { text: "Good prioritization - structured process with regular reviews", value: 2 },
      { text: "Basic prioritization - some structure but inconsistent application", value: 3 },
      { text: "Poor prioritization - ad hoc requirements gathering", value: 4 },
      { text: "No prioritization - reactive feature development", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.3",
    questionText: "How well do you validate product ideas before development?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Rigorous validation - comprehensive testing and user research", value: 1 },
      { text: "Good validation - structured testing with user feedback", value: 2 },
      { text: "Basic validation - some testing but limited scope", value: 3 },
      { text: "Poor validation - minimal testing before development", value: 4 },
      { text: "No validation - build first, test later approach", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.4",
    questionText: "How effectively do you measure product performance and success?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Comprehensive metrics - detailed analytics with actionable insights", value: 1 },
      { text: "Good metrics - solid tracking with regular analysis", value: 2 },
      { text: "Basic metrics - some tracking but limited analysis", value: 3 },
      { text: "Poor metrics - minimal performance measurement", value: 4 },
      { text: "No metrics - operating without product performance data", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.5",
    questionText: "How well do you manage product lifecycle and evolution?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Strategic lifecycle management - planned evolution with clear stages", value: 1 },
      { text: "Good lifecycle management - structured approach to product evolution", value: 2 },
      { text: "Basic lifecycle management - some planning for product changes", value: 3 },
      { text: "Poor lifecycle management - reactive approach to product evolution", value: 4 },
      { text: "No lifecycle management - products evolve without strategic direction", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.6",
    questionText: "How effectively do you integrate customer feedback into product development?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Seamless integration - customer feedback drives product decisions", value: 1 },
      { text: "Good integration - regular feedback incorporation with clear processes", value: 2 },
      { text: "Basic integration - some feedback incorporated but inconsistently", value: 3 },
      { text: "Poor integration - limited customer feedback incorporation", value: 4 },
      { text: "No integration - product development happens without customer input", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.7",
    questionText: "How well do you balance innovation with stability in product development?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Optimal balance - strategic innovation without compromising stability", value: 1 },
      { text: "Good balance - controlled innovation with stable core features", value: 2 },
      { text: "Adequate balance - some innovation but conservative approach", value: 3 },
      { text: "Poor balance - either too innovative or too conservative", value: 4 },
      { text: "No balance - chaotic approach to innovation and stability", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.8",
    questionText: "How effectively do you compete and differentiate your products?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "Clear differentiation - unique value proposition with competitive advantages", value: 1 },
      { text: "Good differentiation - clear positioning with some competitive edge", value: 2 },
      { text: "Basic differentiation - some unique features but limited competitive advantage", value: 3 },
      { text: "Poor differentiation - products similar to competitors with little advantage", value: 4 },
      { text: "No differentiation - commoditized products competing mainly on price", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.9",
    questionText: "How well do you scale product development as your company grows?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Highly scalable - product development scales efficiently with growth", value: 1 },
      { text: "Well scalable - good processes that adapt to increased complexity", value: 2 },
      { text: "Moderately scalable - some processes scale but bottlenecks exist", value: 3 },
      { text: "Poorly scalable - product development struggles with company growth", value: 4 },
      { text: "Not scalable - product development becomes chaotic as company grows", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Product Strategy",
    questionId: "8.10",
    questionText: "How effectively do you align product strategy with business objectives?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Perfect alignment - product strategy directly supports business goals", value: 1 },
      { text: "Strong alignment - clear connection between product and business strategy", value: 2 },
      { text: "Good alignment - product strategy generally supports business objectives", value: 3 },
      { text: "Weak alignment - limited connection between product and business strategy", value: 4 },
      { text: "No alignment - product strategy operates independently of business objectives", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 9: Market Position
  {
    domainName: "Market Position",
    questionId: "9.1",
    questionText: "How well do you understand your target market and customer segments?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Deep understanding - comprehensive market research and customer insights", value: 1 },
      { text: "Good understanding - solid market knowledge with regular research", value: 2 },
      { text: "Basic understanding - general market knowledge but limited depth", value: 3 },
      { text: "Poor understanding - limited market research and customer insights", value: 4 },
      { text: "No understanding - operating without market research or customer data", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.2",
    questionText: "How effectively do you monitor and respond to competitive threats?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Proactive monitoring - systematic competitive intelligence and rapid response", value: 1 },
      { text: "Good monitoring - regular competitive analysis with timely responses", value: 2 },
      { text: "Basic monitoring - some competitive awareness but slow response", value: 3 },
      { text: "Poor monitoring - limited competitive intelligence and reactive responses", value: 4 },
      { text: "No monitoring - unaware of competitive threats until too late", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.3",
    questionText: "How strong is your brand recognition and market presence?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Strong brand - widely recognized with excellent market presence", value: 1 },
      { text: "Good brand - solid recognition within target market", value: 2 },
      { text: "Moderate brand - some recognition but limited market presence", value: 3 },
      { text: "Weak brand - minimal recognition and poor market presence", value: 4 },
      { text: "Unknown brand - no market recognition or presence", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.4",
    questionText: "How effectively do you identify and capitalize on market opportunities?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Excellent opportunity identification - systematic market scanning and quick action", value: 1 },
      { text: "Good opportunity identification - regular market analysis with strategic action", value: 2 },
      { text: "Basic opportunity identification - some market awareness but slow action", value: 3 },
      { text: "Poor opportunity identification - limited market scanning and missed opportunities", value: 4 },
      { text: "No opportunity identification - reactive approach without market analysis", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.5",
    questionText: "How well do you adapt your strategy to market changes?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Highly adaptive - quick strategic pivots based on market signals", value: 1 },
      { text: "Well adaptive - structured approach to strategy adaptation", value: 2 },
      { text: "Moderately adaptive - some strategy changes but slow to implement", value: 3 },
      { text: "Poorly adaptive - limited strategy changes despite market shifts", value: 4 },
      { text: "Not adaptive - strategy remains static regardless of market changes", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.6",
    questionText: "How effectively do you penetrate new markets or segments?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Excellent penetration - systematic approach with high success rates", value: 1 },
      { text: "Good penetration - structured market entry with reasonable success", value: 2 },
      { text: "Basic penetration - some market expansion but limited success", value: 3 },
      { text: "Poor penetration - failed attempts at market expansion", value: 4 },
      { text: "No penetration - unable to expand beyond current market", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.7",
    questionText: "How well do you price your products relative to market conditions?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Optimal pricing - strategic pricing that maximizes value and market position", value: 1 },
      { text: "Good pricing - competitive pricing with solid market positioning", value: 2 },
      { text: "Adequate pricing - reasonable pricing but room for optimization", value: 3 },
      { text: "Poor pricing - pricing misaligned with market or value proposition", value: 4 },
      { text: "Bad pricing - pricing strategy hurts competitiveness and profitability", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.8",
    questionText: "How effectively do you communicate your value proposition to the market?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "Clear communication - compelling value proposition clearly understood by market", value: 1 },
      { text: "Good communication - value proposition generally well understood", value: 2 },
      { text: "Adequate communication - some clarity but message could be stronger", value: 3 },
      { text: "Poor communication - value proposition unclear or confusing to market", value: 4 },
      { text: "No communication - value proposition not effectively communicated", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.9",
    questionText: "How well do you leverage partnerships and alliances for market position?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Strategic partnerships - partnerships significantly enhance market position", value: 1 },
      { text: "Good partnerships - solid alliances that provide market benefits", value: 2 },
      { text: "Basic partnerships - some partnerships but limited market impact", value: 3 },
      { text: "Poor partnerships - partnerships provide minimal market benefit", value: 4 },
      { text: "No partnerships - operating without strategic alliances", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Market Position",
    questionId: "9.10",
    questionText: "How sustainable is your current market position?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Highly sustainable - strong moats and defensible market position", value: 1 },
      { text: "Well sustainable - good market position with some competitive advantages", value: 2 },
      { text: "Moderately sustainable - adequate position but vulnerable to competition", value: 3 },
      { text: "Poorly sustainable - weak market position easily threatened", value: 4 },
      { text: "Not sustainable - market position is precarious and at risk", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 10: Risk Management
  {
    domainName: "Risk Management",
    questionId: "10.1",
    questionText: "How systematically do you identify and assess business risks?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Comprehensive risk assessment - systematic identification with quantified impact analysis", value: 1 },
      { text: "Good risk assessment - structured approach with regular risk reviews", value: 2 },
      { text: "Basic risk assessment - some risk identification but limited analysis", value: 3 },
      { text: "Poor risk assessment - ad hoc risk identification without systematic approach", value: 4 },
      { text: "No risk assessment - operating without formal risk identification process", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.2",
    questionText: "How effectively do you mitigate operational risks?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Proactive mitigation - comprehensive controls and contingency plans", value: 1 },
      { text: "Good mitigation - solid risk controls with regular monitoring", value: 2 },
      { text: "Basic mitigation - some risk controls but inconsistent implementation", value: 3 },
      { text: "Poor mitigation - limited risk controls and reactive responses", value: 4 },
      { text: "No mitigation - operating without operational risk controls", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.3",
    questionText: "How well do you manage financial and cash flow risks?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Excellent financial risk management - sophisticated monitoring and hedging strategies", value: 1 },
      { text: "Good financial risk management - solid controls and cash flow planning", value: 2 },
      { text: "Basic financial risk management - some controls but limited sophistication", value: 3 },
      { text: "Poor financial risk management - minimal controls and reactive approach", value: 4 },
      { text: "No financial risk management - exposed to significant financial volatility", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.4",
    questionText: "How prepared are you for business continuity and disaster recovery?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Fully prepared - comprehensive business continuity plans tested regularly", value: 1 },
      { text: "Well prepared - solid continuity plans with periodic testing", value: 2 },
      { text: "Basically prepared - some continuity planning but limited testing", value: 3 },
      { text: "Poorly prepared - minimal continuity planning and no testing", value: 4 },
      { text: "Not prepared - no business continuity or disaster recovery plans", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.5",
    questionText: "How effectively do you manage regulatory and compliance risks?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Comprehensive compliance - proactive regulatory management with expert oversight", value: 1 },
      { text: "Good compliance - structured approach to regulatory requirements", value: 2 },
      { text: "Basic compliance - meets current requirements but limited forward planning", value: 3 },
      { text: "Poor compliance - struggles to meet regulatory requirements consistently", value: 4 },
      { text: "Non-compliance - significant regulatory gaps posing business risk", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.6",
    questionText: "How well do you manage key person and talent risks?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Excellent talent risk management - succession planning and knowledge transfer systems", value: 1 },
      { text: "Good talent risk management - some succession planning and documentation", value: 2 },
      { text: "Basic talent risk management - awareness of key person risks but limited planning", value: 3 },
      { text: "Poor talent risk management - heavily dependent on key individuals", value: 4 },
      { text: "Critical talent risks - business vulnerable to loss of key personnel", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.7",
    questionText: "How effectively do you monitor and respond to emerging risks?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Proactive monitoring - early warning systems with rapid response capabilities", value: 1 },
      { text: "Good monitoring - regular risk scanning with structured response plans", value: 2 },
      { text: "Basic monitoring - some risk awareness but slow response", value: 3 },
      { text: "Poor monitoring - limited risk scanning and reactive responses", value: 4 },
      { text: "No monitoring - unaware of emerging risks until they materialize", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.8",
    questionText: "How well do you manage cybersecurity and data protection risks?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "Advanced cybersecurity - comprehensive security framework with regular testing", value: 1 },
      { text: "Good cybersecurity - solid security measures with ongoing monitoring", value: 2 },
      { text: "Basic cybersecurity - standard security measures but room for improvement", value: 3 },
      { text: "Poor cybersecurity - minimal security measures with significant vulnerabilities", value: 4 },
      { text: "No cybersecurity - operating without adequate data protection measures", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.9",
    questionText: "How effectively do you communicate risks throughout the organization?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Clear risk communication - transparent risk reporting at all organizational levels", value: 1 },
      { text: "Good risk communication - regular risk updates to key stakeholders", value: 2 },
      { text: "Basic risk communication - some risk reporting but inconsistent", value: 3 },
      { text: "Poor risk communication - limited risk awareness throughout organization", value: 4 },
      { text: "No risk communication - risks not communicated beyond senior management", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Risk Management",
    questionId: "10.10",
    questionText: "How well integrated is risk management into your strategic planning?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Fully integrated - risk considerations central to all strategic decisions", value: 1 },
      { text: "Well integrated - risk factors considered in strategic planning process", value: 2 },
      { text: "Partially integrated - some risk consideration but not systematic", value: 3 },
      { text: "Poorly integrated - limited risk consideration in strategic planning", value: 4 },
      { text: "Not integrated - strategic planning happens without risk assessment", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 11: Innovation Pipeline
  {
    domainName: "Innovation Pipeline",
    questionId: "11.1",
    questionText: "How systematically do you generate and capture new ideas?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Systematic idea generation - structured innovation processes with multiple sources", value: 1 },
      { text: "Good idea generation - regular brainstorming and idea collection", value: 2 },
      { text: "Basic idea generation - some innovation activities but inconsistent", value: 3 },
      { text: "Poor idea generation - limited innovation focus and few new ideas", value: 4 },
      { text: "No idea generation - operating without systematic innovation processes", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.2",
    questionText: "How effectively do you evaluate and prioritize innovation opportunities?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Rigorous evaluation - comprehensive framework for innovation assessment", value: 1 },
      { text: "Good evaluation - structured approach to innovation prioritization", value: 2 },
      { text: "Basic evaluation - some criteria for innovation decisions", value: 3 },
      { text: "Poor evaluation - ad hoc innovation decisions without clear criteria", value: 4 },
      { text: "No evaluation - innovation happens without systematic assessment", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.3",
    questionText: "How well do you allocate resources for innovation initiatives?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "Strategic resource allocation - dedicated innovation budget with clear ROI tracking", value: 1 },
      { text: "Good resource allocation - reasonable innovation funding with oversight", value: 2 },
      { text: "Basic resource allocation - some innovation funding but limited structure", value: 3 },
      { text: "Poor resource allocation - minimal resources dedicated to innovation", value: 4 },
      { text: "No resource allocation - innovation competes for operational resources", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.4",
    questionText: "How effectively do you prototype and test new innovations?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Rapid prototyping - systematic testing with quick iteration cycles", value: 1 },
      { text: "Good prototyping - structured testing process with user feedback", value: 2 },
      { text: "Basic prototyping - some testing but limited iteration", value: 3 },
      { text: "Poor prototyping - minimal testing before full development", value: 4 },
      { text: "No prototyping - innovation goes directly to full development", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.5",
    questionText: "How well do you scale successful innovations from concept to market?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Excellent scaling - systematic process from innovation to market success", value: 1 },
      { text: "Good scaling - structured approach to innovation commercialization", value: 2 },
      { text: "Basic scaling - some success at bringing innovations to market", value: 3 },
      { text: "Poor scaling - struggle to commercialize innovative ideas", value: 4 },
      { text: "No scaling - innovations remain as concepts without market impact", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.6",
    questionText: "How effectively do you foster a culture of innovation?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Strong innovation culture - organization-wide commitment to innovation", value: 1 },
      { text: "Good innovation culture - positive attitude toward innovation with support", value: 2 },
      { text: "Basic innovation culture - some innovation support but not pervasive", value: 3 },
      { text: "Weak innovation culture - limited organizational support for innovation", value: 4 },
      { text: "No innovation culture - organization resists change and new ideas", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.7",
    questionText: "How well do you balance core business with innovation investments?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Optimal balance - strategic allocation between core business and innovation", value: 1 },
      { text: "Good balance - reasonable split with clear rationale", value: 2 },
      { text: "Adequate balance - some attention to both but room for optimization", value: 3 },
      { text: "Poor balance - either too focused on core business or too much innovation", value: 4 },
      { text: "No balance - chaotic approach to core business vs innovation allocation", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.8",
    questionText: "How effectively do you learn from innovation failures?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "Excellent learning - systematic failure analysis with knowledge capture", value: 1 },
      { text: "Good learning - structured approach to learning from failures", value: 2 },
      { text: "Basic learning - some reflection on failures but limited systematic learning", value: 3 },
      { text: "Poor learning - failures acknowledged but little systematic learning", value: 4 },
      { text: "No learning - failures ignored or blamed without systematic analysis", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.9",
    questionText: "How well do you track and measure innovation performance?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Comprehensive metrics - detailed innovation KPIs with regular tracking", value: 1 },
      { text: "Good metrics - solid innovation measurement with regular reviews", value: 2 },
      { text: "Basic metrics - some innovation tracking but limited depth", value: 3 },
      { text: "Poor metrics - minimal innovation performance measurement", value: 4 },
      { text: "No metrics - innovation happens without performance tracking", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Innovation Pipeline",
    questionId: "11.10",
    questionText: "How well do you stay ahead of industry trends and disruptions?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Trend leadership - proactively shape industry direction with innovative solutions", value: 1 },
      { text: "Trend awareness - stay current with industry developments and adapt quickly", value: 2 },
      { text: "Basic trend tracking - some awareness of trends but slow to adapt", value: 3 },
      { text: "Poor trend tracking - limited industry awareness and reactive responses", value: 4 },
      { text: "No trend tracking - unaware of industry changes until they impact business", value: 5 }
    ],
    followUpLogic: null
  },

  // Domain 12: Governance & Compliance
  {
    domainName: "Governance & Compliance",
    questionId: "12.1",
    questionText: "How well structured is your corporate governance framework?",
    questionType: "core",
    industry: null,
    orderIndex: 1,
    options: [
      { text: "Excellent governance - comprehensive framework with clear accountability", value: 1 },
      { text: "Good governance - solid structure with regular oversight", value: 2 },
      { text: "Basic governance - adequate structure but room for improvement", value: 3 },
      { text: "Poor governance - minimal structure with unclear accountability", value: 4 },
      { text: "No governance - operating without formal governance framework", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.2",
    questionText: "How effectively do you ensure regulatory compliance across your operations?",
    questionType: "core",
    industry: null,
    orderIndex: 2,
    options: [
      { text: "Proactive compliance - comprehensive compliance program with regular audits", value: 1 },
      { text: "Good compliance - structured approach to regulatory requirements", value: 2 },
      { text: "Basic compliance - meets most requirements but inconsistent monitoring", value: 3 },
      { text: "Poor compliance - struggles with regulatory requirements", value: 4 },
      { text: "Non-compliance - significant regulatory gaps posing legal risk", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.3",
    questionText: "How well do you manage ethical standards and corporate responsibility?",
    questionType: "core",
    industry: null,
    orderIndex: 3,
    options: [
      { text: "High ethical standards - comprehensive ethics program with strong culture", value: 1 },
      { text: "Good ethical standards - clear ethics policies with regular training", value: 2 },
      { text: "Basic ethical standards - some ethics guidelines but limited enforcement", value: 3 },
      { text: "Poor ethical standards - minimal ethics framework and unclear expectations", value: 4 },
      { text: "No ethical standards - operating without formal ethics guidelines", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.4",
    questionText: "How effectively do you manage internal controls and audit functions?",
    questionType: "core",
    industry: null,
    orderIndex: 4,
    options: [
      { text: "Robust controls - comprehensive internal controls with regular independent audits", value: 1 },
      { text: "Good controls - solid internal controls with periodic reviews", value: 2 },
      { text: "Basic controls - some internal controls but limited systematic review", value: 3 },
      { text: "Weak controls - minimal internal controls with rare auditing", value: 4 },
      { text: "No controls - operating without systematic internal controls", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.5",
    questionText: "How well do you handle legal and contractual obligations?",
    questionType: "core",
    industry: null,
    orderIndex: 5,
    options: [
      { text: "Excellent legal management - proactive legal oversight with contract optimization", value: 1 },
      { text: "Good legal management - solid legal processes with regular contract review", value: 2 },
      { text: "Basic legal management - adequate legal compliance but reactive approach", value: 3 },
      { text: "Poor legal management - struggles with contractual obligations and legal issues", value: 4 },
      { text: "No legal management - operating without systematic legal oversight", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.6",
    questionText: "How effectively do you manage board relationships and reporting?",
    questionType: "core",
    industry: null,
    orderIndex: 6,
    options: [
      { text: "Excellent board relations - transparent communication with strategic board engagement", value: 1 },
      { text: "Good board relations - regular reporting with positive board engagement", value: 2 },
      { text: "Basic board relations - adequate reporting but limited strategic engagement", value: 3 },
      { text: "Poor board relations - minimal communication and strained relationships", value: 4 },
      { text: "No board oversight - operating without effective board governance", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.7",
    questionText: "How well do you manage stakeholder relationships and communications?",
    questionType: "core",
    industry: null,
    orderIndex: 7,
    options: [
      { text: "Strategic stakeholder management - proactive engagement with clear communication", value: 1 },
      { text: "Good stakeholder management - regular communication with key stakeholders", value: 2 },
      { text: "Basic stakeholder management - some communication but inconsistent engagement", value: 3 },
      { text: "Poor stakeholder management - limited communication and weak relationships", value: 4 },
      { text: "No stakeholder management - operating without systematic stakeholder engagement", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.8",
    questionText: "How effectively do you ensure transparency and accountability?",
    questionType: "core",
    industry: null,
    orderIndex: 8,
    options: [
      { text: "High transparency - comprehensive reporting with clear accountability structures", value: 1 },
      { text: "Good transparency - regular reporting with defined accountability", value: 2 },
      { text: "Basic transparency - some reporting but limited accountability measures", value: 3 },
      { text: "Poor transparency - minimal reporting and unclear accountability", value: 4 },
      { text: "No transparency - operating without systematic reporting or accountability", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.9",
    questionText: "How well do you manage privacy and data governance?",
    questionType: "core",
    industry: null,
    orderIndex: 9,
    options: [
      { text: "Comprehensive data governance - robust privacy framework with regular compliance monitoring", value: 1 },
      { text: "Good data governance - solid privacy policies with systematic compliance", value: 2 },
      { text: "Basic data governance - adequate privacy measures but room for improvement", value: 3 },
      { text: "Poor data governance - minimal privacy protection and compliance gaps", value: 4 },
      { text: "No data governance - operating without systematic privacy protection", value: 5 }
    ],
    followUpLogic: null
  },
  {
    domainName: "Governance & Compliance",
    questionId: "12.10",
    questionText: "How ready is your organization to embrace and execute the changes needed for growth?",
    questionType: "core",
    industry: null,
    orderIndex: 10,
    options: [
      { text: "Highly change-ready - organization embraces change as competitive advantage", value: 1 },
      { text: "Change-ready - organization adapts well to change with good change capacity", value: 2 },
      { text: "Moderately change-ready - organization can handle change but requires significant management", value: 3 },
      { text: "Change-resistant - organization struggles with change requiring extensive change management", value: 4 },
      { text: "Change-adverse - organization actively resists change making growth initiatives very difficult", value: 5 }
    ],
    followUpLogic: null
  }
];

export async function seedAssessmentQuestions(): Promise<void> {
  try {
    console.log("Seeding assessment questions...");
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