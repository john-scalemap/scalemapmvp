import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DomainHeatmap } from "@/components/DomainHeatmap";
import { AgentCard } from "@/components/AgentCard";
import type { Assessment, AssessmentDomain, Agent, Document } from "@shared/schema";
import { 
  ChartLineIcon, 
  ClockIcon, 
  CheckIcon,
  SettingsIcon,
  FileTextIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  LightbulbIcon,
  BellIcon,
  DownloadIcon,
  HeadphonesIcon
} from "lucide-react";

interface DashboardProps {
  params: { id: string };
}

type AssessmentDetail = Assessment & {
  domains: AssessmentDomain[];
  documents: Document[];
  operationalDomains: string[];
  availableAgents: Agent[];
};

export default function Dashboard({ params }: DashboardProps) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: assessmentData, isLoading } = useQuery<AssessmentDetail>({
    queryKey: ["/api/assessments", params.id],
    retry: false,
    enabled: isAuthenticated && !!params.id,
  });

  const handleUnauthorizedError = (error: Error) => {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertTriangleIcon className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Assessment Not Found</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              The requested assessment could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assessment = assessmentData;
  const domains = assessmentData.domains || [];
  const activeAgents = assessmentData.availableAgents?.slice(0, 5) || [];

  // Use real domain data from the assessment with fallback to defaults  
  const domainData: Array<{name: string, score: number, health: 'critical' | 'warning' | 'good' | 'excellent', summary: string, agent: string}> = domains.length > 0 ? domains.map(domain => ({
    name: domain.domainName,
    score: domain.score ? parseFloat(domain.score) : 0,
    health: (domain.health as 'critical' | 'warning' | 'good' | 'excellent') || 'warning',
    summary: domain.summary || 'Analysis pending...',
    agent: (domain as any).agentName || 'Unassigned'
  })) : [
    { name: "Strategic Alignment", score: 0, health: "warning", summary: "Assessment not yet started", agent: "Dr. Alexandra Chen" },
    { name: "Financial Management", score: 0, health: "warning", summary: "Assessment not yet started", agent: "Marcus Rodriguez" },
    { name: "Revenue Engine", score: 0, health: "warning", summary: "Assessment not yet started", agent: "Sarah Mitchell" },
    { name: "Operations Excellence", score: 0, health: "warning", summary: "Assessment not yet started", agent: "David Park" },
    { name: "People & Organization", score: 0, health: "warning", summary: "Assessment not yet started", agent: "Dr. Rachel Thompson" },
    { name: "Technology & Data", score: 0, health: "warning", summary: "Assessment not yet started", agent: "Kevin Wu" },
  ];

  const getProgressSteps = () => {
    const steps = [
      { 
        label: "Assessment Complete", 
        sublabel: "12 domains analyzed",
        completed: assessment.status !== 'pending',
        active: assessment.status === 'in_progress',
        icon: CheckIcon 
      },
      { 
        label: "AI Analysis", 
        sublabel: "5 agents active",
        completed: assessment.status === 'completed',
        active: assessment.status === 'analysis',
        icon: SettingsIcon 
      },
      { 
        label: "Report Generation", 
        sublabel: "Pending validation",
        completed: false,
        active: false,
        icon: FileTextIcon 
      },
    ];
    return steps;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <ChartLineIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">ScaleMap</h1>
                  <p className="text-sm text-muted-foreground">Growth Bottleneck Intelligence</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-accent px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-accent-foreground" data-testid="status-assessment">
                  Assessment {assessment.status === 'analysis' ? 'in Progress' : 'Active'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-8 h-8 rounded-full object-cover"
                    data-testid="img-avatar"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground" data-testid="text-username">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CEO, {user?.companyName || "Company"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Payment Required Section - Show when questionnaire complete but payment pending */}
        {((assessment.progress ?? 0) >= 100 && ['pending', 'awaiting_payment'].includes(assessment.status)) && (
          <div className="mb-8">
            <Card className="border shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950" data-testid="card-payment-required">
              <CardContent className="p-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckIcon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">Assessment Complete!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your questionnaire is 100% complete. To begin your AI-powered analysis, please complete your payment.
                  </p>
                  <div className="bg-card rounded-lg p-4 mb-6">
                    <div className="text-3xl font-bold text-primary mb-2">£7,500</div>
                    <div className="text-sm text-muted-foreground">Complete Growth Analysis</div>
                  </div>
                  <Button 
                    size="lg" 
                    className="w-full text-lg"
                    onClick={() => {
                      // Navigate to checkout page - let it handle payment intent creation securely
                      window.location.href = `/checkout?assessmentId=${assessment.id}`;
                    }}
                    data-testid="button-proceed-payment"
                  >
                    Proceed to Payment
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Secure payment processing • 30-day money-back guarantee
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Overview and Analysis - Only show when payment is complete */}
        {assessment.status !== 'awaiting_payment' && (
          <>
            <div className="mb-8">
              <Card className="border shadow-sm" data-testid="card-progress">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground mb-2">Assessment Progress</h2>
                      <p className="text-muted-foreground">
                        AI agents analyzing your operational systems - 47 hours remaining
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary" data-testid="text-progress">
                        {assessment.progress || 68}%
                      </div>
                      <div className="text-sm text-muted-foreground">Complete</div>
                    </div>
                  </div>
                  
                  {/* Progress Steps */}
                  <div className="flex items-center space-x-4">
                    {getProgressSteps().map((step, index) => (
                      <div key={index} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.completed ? 'bg-primary' :
                          step.active ? 'bg-primary animate-pulse' : 'bg-muted'
                        }`}>
                          <step.icon className={`w-4 h-4 ${
                            step.completed || step.active ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="ml-3">
                          <p className={`text-sm font-medium ${
                            step.completed || step.active ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{step.sublabel}</p>
                        </div>
                        {index < getProgressSteps().length - 1 && (
                          <div className={`flex-1 h-px mx-4 ${
                            step.completed ? 'bg-primary' : 'bg-border'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column: Domain Heatmap & Active Agents */}
          <div className="xl:col-span-2 space-y-8">
            {/* Operational Health Heatmap */}
            <Card className="border shadow-sm" data-testid="card-heatmap">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Operational Health Heatmap</CardTitle>
                    <p className="text-muted-foreground">12-domain diagnostic analysis</p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Excellent (8-10)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Good (6-7)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span>Attention (4-5)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Critical (1-3)</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DomainHeatmap domains={domainData} />
              </CardContent>
            </Card>

            {/* Active AI Agents */}
            <Card className="border shadow-sm" data-testid="card-agents">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Active Analysis Team</CardTitle>
                    <p className="text-muted-foreground">5 specialist agents analyzing your priority domains</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground">Live Analysis</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeAgents.map((agent, index) => (
                    <AgentCard 
                      key={index}
                      agent={{
                        name: agent.name,
                        specialty: agent.specialty,
                        background: agent.background || 'Expert analyst',
                        expertise: agent.expertise || 'Specialized analysis',
                        profileImageUrl: agent.profileImageUrl || undefined
                      }}
                      priority={index < 2 ? 'critical' : index < 4 ? 'warning' : 'good'}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Insights & Timeline */}
          <div className="space-y-8">
            {/* Key Insights */}
            <Card className="border shadow-sm" data-testid="card-insights">
              <CardHeader>
                <CardTitle className="text-lg">Early Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <AlertTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-800">Strategic Misalignment</h4>
                      <p className="text-sm text-red-700 mt-1">
                        Leadership team shows 40% variance in strategic priorities, creating resource allocation inefficiencies.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <TrendingUpIcon className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-800">Process Bottleneck</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Operations team spending 60% of time on manual processes that could be automated.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <LightbulbIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-800">Quick Win Opportunity</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Revenue team has 23% pipeline conversion opportunity through process standardization.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Timeline */}
            <Card className="border shadow-sm" data-testid="card-timeline">
              <CardHeader>
                <CardTitle className="text-lg">Delivery Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">Executive Summary</p>
                      <Badge variant="default" className="bg-green-500">Delivered</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">24-hour strategic overview completed</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
                    <SettingsIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground">Detailed Analysis</p>
                      <Badge variant="secondary">In Progress</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">48-hour comprehensive report - 23 hours remaining</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                    <FileTextIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-muted-foreground">Implementation Kits</p>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">72-hour accelerator kits after validation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assessment Stats */}
            <Card className="border shadow-sm" data-testid="card-stats">
              <CardHeader>
                <CardTitle className="text-lg">Assessment Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Assessment Completion</span>
                  <span className="font-semibold text-foreground">100%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Domains Analyzed</span>
                  <span className="font-semibold text-foreground">12/12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Documents Uploaded</span>
                  <span className="font-semibold text-foreground">{assessment.documentsUploaded || 0} files</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Active Agents</span>
                  <span className="font-semibold text-foreground">5/12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Priority Issues</span>
                  <span className="font-semibold text-destructive">3 Critical</span>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20" data-testid="card-support">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <HeadphonesIcon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Need Support?</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your dedicated advisor Sarah is available for any questions about your analysis.
                    </p>
                    <Button variant="outline" size="sm" data-testid="button-contact-advisor">
                      <HeadphonesIcon className="w-4 h-4 mr-2" />
                      Contact Advisor
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Bottom Navigation/Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-foreground">Analysis Active</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Next update in 6 hours
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" data-testid="button-download-summary">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download Summary
              </Button>
              <Button size="sm" data-testid="button-set-alerts">
                <BellIcon className="w-4 h-4 mr-2" />
                Set Alerts
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
