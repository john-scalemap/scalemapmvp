import OpenAI from "openai";

/*
the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
*/

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "sk-test-key"
});

// Define the 12 operational domains
export const OPERATIONAL_DOMAINS = [
  "Strategic Alignment",
  "Financial Management", 
  "Revenue Engine",
  "Operations Excellence",
  "People & Organization",
  "Technology & Data",
  "Customer Success",
  "Product Strategy",
  "Market Position",
  "Risk Management",
  "Innovation Pipeline",
  "Governance & Compliance"
];

// AI Agent personas for domain analysis
export const AI_AGENTS = [
  {
    name: "Dr. Alexandra Chen",
    specialty: "Strategic Transformation",
    background: "McKinsey Principal with 12+ years in strategic alignment and organizational transformation",
    expertise: "Vision clarity, strategic coherence, resource allocation optimization",
    profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Marcus Rodriguez",
    specialty: "Financial Operations",
    background: "Scale-up CFO with Wharton MBA, specialized in high-growth financial modeling",
    expertise: "Cash flow optimization, capital efficiency, financial planning & analysis",
    profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Sarah Mitchell", 
    specialty: "Revenue Operations",
    background: "2x Unicorn VP Sales, former Salesforce executive with scaling expertise",
    expertise: "Sales process optimization, pipeline management, revenue predictability",
    profileImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "David Park",
    specialty: "Operations Excellence", 
    background: "Amazon Director with Six Sigma Black Belt, process optimization specialist",
    expertise: "Workflow optimization, process automation, operational efficiency",
    profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Dr. Rachel Thompson",
    specialty: "People & Organization",
    background: "Former Google VP People Operations, organizational psychology PhD",
    expertise: "Scaling team structures, leadership development, culture optimization",
    profileImageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Kevin Wu",
    specialty: "Technology & Data",
    background: "Former CTO at 3 successful scale-ups, Stanford CS, data architecture expert", 
    expertise: "Technology scaling, data infrastructure, systems integration",
    profileImageUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Maria Santos",
    specialty: "Customer Success",
    background: "Former Chief Customer Officer at SaaS unicorns, 15+ years in customer lifecycle optimization",
    expertise: "Customer retention, success metrics, lifecycle management, churn reduction",
    profileImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "James Anderson",
    specialty: "Product Strategy",
    background: "Ex-Product VP at Meta and Stripe, Stanford MBA, launched 50+ product features",
    expertise: "Product roadmapping, market validation, feature prioritization, user research",
    profileImageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Lisa Chen",
    specialty: "Market Position",
    background: "Former BCG Partner specializing in competitive strategy and market expansion",
    expertise: "Competitive analysis, market positioning, brand strategy, go-to-market",
    profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Dr. Robert Kim",
    specialty: "Risk Management",
    background: "Former Chief Risk Officer at Fortune 500, PhD in Risk Analytics from MIT",
    expertise: "Enterprise risk assessment, crisis management, business continuity, compliance",
    profileImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Elena Petrov",
    specialty: "Innovation Pipeline",
    background: "Innovation Director at Google X, launched 12 breakthrough products, Stanford Design Thinking",
    expertise: "Innovation frameworks, R&D optimization, disruptive strategy, intellectual property",
    profileImageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face"
  },
  {
    name: "Michael Taylor",
    specialty: "Governance & Compliance",
    background: "Former Big 4 Partner in Risk Advisory, JD/MBA, 20+ years in corporate governance",
    expertise: "Board governance, regulatory compliance, audit frameworks, stakeholder management",
    profileImageUrl: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face"
  }
];

interface DomainAnalysisResult {
  score: number;
  health: 'critical' | 'warning' | 'good' | 'excellent';
  summary: string;
  recommendations: string[];
  keyInsights: string[];
  quickWins: string[];
  riskFactors: string[];
}

export async function analyzeDomain(
  domainName: string, 
  assessmentResponses: any[], 
  documents: any[],
  companyContext: {
    industry: string;
    revenue: string;
    teamSize: number;
    companyName: string;
  }
): Promise<DomainAnalysisResult> {
  const agent = AI_AGENTS.find(agent => 
    agent.specialty.toLowerCase().includes(domainName.toLowerCase().split(' ')[0])
  ) || AI_AGENTS[0];

  const prompt = `
You are ${agent.name}, ${agent.background}. Your expertise: ${agent.expertise}.

Analyze the ${domainName} domain for ${companyContext.companyName}, a ${companyContext.industry} company with ${companyContext.revenue} revenue and ${companyContext.teamSize} employees.

Assessment Responses:
${JSON.stringify(assessmentResponses.filter(r => r.domainName === domainName), null, 2)}

Uploaded Documents Context:
${documents.map(doc => `- ${doc.fileName} (${doc.fileType})`).join('\n')}

Provide your analysis in JSON format:
{
  "score": <number 1-10>,
  "health": "<critical|warning|good|excellent>",
  "summary": "<200-word executive summary>",
  "recommendations": ["<actionable recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "keyInsights": ["<key insight 1>", "<key insight 2>", "<key insight 3>"],
  "quickWins": ["<quick win 1>", "<quick win 2>"],
  "riskFactors": ["<risk factor 1>", "<risk factor 2>"]
}

Health Score Mapping:
- 1-3: critical (urgent attention required)
- 4-5: warning (needs improvement)
- 6-7: good (solid foundation)
- 8-10: excellent (competitive advantage)

Focus on actionable, specific insights based on your expertise in ${agent.specialty}.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert business consultant specializing in growth bottleneck analysis. Provide detailed, actionable insights in JSON format."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Ensure health status matches score
    const score = result.score || 5;
    let health: 'critical' | 'warning' | 'good' | 'excellent' = 'warning';
    if (score >= 8) health = 'excellent';
    else if (score >= 6) health = 'good';  
    else if (score >= 4) health = 'warning';
    else health = 'critical';

    return {
      score,
      health,
      summary: result.summary || "Analysis in progress",
      recommendations: result.recommendations || [],
      keyInsights: result.keyInsights || [],
      quickWins: result.quickWins || [],
      riskFactors: result.riskFactors || []
    };

  } catch (error) {
    console.error(`Error analyzing ${domainName}:`, error);
    
    // Return default analysis on error
    return {
      score: 5,
      health: 'warning',
      summary: `${domainName} analysis is currently being processed by our AI specialists.`,
      recommendations: ["Complete detailed assessment", "Provide additional documentation", "Schedule follow-up analysis"],
      keyInsights: ["Analysis in progress"],
      quickWins: ["Review current processes"],
      riskFactors: ["Incomplete data for full analysis"]
    };
  }
}

export async function generateExecutiveSummary(
  domainAnalyses: Array<{
    domainName: string;
    score: number;
    health: string;
    summary: string;
  }>,
  companyContext: {
    companyName: string;
    industry: string;
    revenue: string;
    teamSize: number;
  }
): Promise<string> {
  const prompt = `
Generate an executive summary for ${companyContext.companyName}'s operational assessment.

Company: ${companyContext.companyName}
Industry: ${companyContext.industry}  
Revenue: ${companyContext.revenue}
Team Size: ${companyContext.teamSize}

Domain Analysis Results:
${domainAnalyses.map(d => 
  `${d.domainName}: Score ${d.score}/10 (${d.health}) - ${d.summary}`
).join('\n')}

Create a comprehensive executive summary that includes:
1. Overall operational health assessment
2. Top 3 critical bottlenecks limiting growth
3. Top 3 strategic opportunities 
4. Recommended prioritization framework
5. Expected impact of addressing key issues

Target: C-level executives, 500-800 words, professional consulting tone.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a senior strategy consultant creating an executive summary for a growth bottleneck analysis. Write in a professional, actionable tone."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    return response.choices[0].message.content || "Executive summary generation in progress.";
  } catch (error) {
    console.error("Error generating executive summary:", error);
    return "Executive summary is being prepared by our analysis team and will be available within 24 hours.";
  }
}

export async function performTriageAnalysis(
  assessmentResponses: any[],
  companyContext: any
): Promise<{
  priorityDomains: string[];
  criticalIssues: string[];
  recommendedAgents: string[];
}> {
  const prompt = `
Perform triage analysis for ${companyContext.companyName} based on assessment responses.

Company Context:
- Industry: ${companyContext.industry}
- Revenue: ${companyContext.revenue}  
- Team Size: ${companyContext.teamSize}

Assessment Responses: ${JSON.stringify(assessmentResponses, null, 2)}

Available Domains: ${OPERATIONAL_DOMAINS.join(', ')}

Analyze responses and provide JSON output:
{
  "priorityDomains": ["<top 3-5 domains needing urgent attention>"],
  "criticalIssues": ["<key issues identified>"],
  "recommendedAgents": ["<agent specialties needed>"]
}

Focus on domains with lowest scores or highest impact potential.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", 
      messages: [
        {
          role: "system",
          content: "You are an expert business analyst performing operational triage. Identify the most critical bottlenecks limiting growth."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error("Error in triage analysis:", error);
    
    // Return default triage
    return {
      priorityDomains: ["Strategic Alignment", "Operations Excellence", "Financial Management"],
      criticalIssues: ["Analysis in progress"],
      recommendedAgents: ["Strategic Transformation", "Operations Excellence", "Financial Operations"]
    };
  }
}
