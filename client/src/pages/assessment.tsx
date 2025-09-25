import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { AssessmentForm } from "@/components/AssessmentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChartLineIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  ArrowRightIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Assessment() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);

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

  // Check for existing active assessments
  const { data: assessments = [] } = useQuery({
    queryKey: ["/api/assessments"],
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    const activeAssessment = (assessments as any[]).find((a: any) => 
      a.status !== 'completed' && a.status !== 'failed'
    );
    
    if (activeAssessment) {
      setCurrentAssessmentId(activeAssessment.id);
    }
  }, [assessments]);

  // Create new assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/assessments", {});
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setCurrentAssessmentId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Assessment Created",
        description: "Your growth analysis has been started.",
      });
    },
    onError: (error) => {
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
      toast({
        title: "Error",
        description: "Failed to create assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartAssessment = () => {
    createAssessmentMutation.mutate();
  };

  const handleAssessmentComplete = (assessmentId: string) => {
    toast({
      title: "Assessment Complete!",
      description: "Your responses have been submitted. Analysis will begin shortly.",
    });
    setLocation(`/dashboard/${assessmentId}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasProfile = user?.companyName && user?.industry;

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-center">Complete Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Please complete your company profile before starting the assessment.
            </p>
            <Button asChild data-testid="button-complete-profile">
              <Link href="/profile">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <ChartLineIcon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">ScaleMap</h1>
                <p className="text-sm text-muted-foreground">Growth Bottleneck Intelligence</p>
              </div>
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
                  CEO, {user?.companyName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!currentAssessmentId ? (
          // Assessment Introduction
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Growth Bottleneck Assessment
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comprehensive 12-domain analysis to identify your organization's critical growth bottlenecks 
                and unlock 20%+ growth acceleration opportunities.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card data-testid="card-assessment-info">
                <CardHeader>
                  <CardTitle>What to Expect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <ClockIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">30-45 Minutes</p>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive questionnaire across 12 operational domains
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <FileTextIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">120 Strategic Questions</p>
                      <p className="text-sm text-muted-foreground">
                        Industry-specific questions tailored to your business model
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Document Upload Support</p>
                      <p className="text-sm text-muted-foreground">
                        Upload supporting documents for deeper analysis
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-domains">
                <CardHeader>
                  <CardTitle>12 Analysis Domains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <p>• Strategic Alignment</p>
                      <p>• Financial Management</p>
                      <p>• Revenue Engine</p>
                      <p>• Operations Excellence</p>
                      <p>• People & Organization</p>
                      <p>• Technology & Data</p>
                    </div>
                    <div className="space-y-1">
                      <p>• Customer Success</p>
                      <p>• Product Strategy</p>
                      <p>• Market Position</p>
                      <p>• Risk Management</p>
                      <p>• Innovation Pipeline</p>
                      <p>• Governance & Compliance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20" data-testid="card-start-assessment">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Ready to Start Your Analysis?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Your assessment is automatically saved as you progress. You can pause and resume at any time.
                </p>
                <Button 
                  size="lg" 
                  className="px-8"
                  onClick={handleStartAssessment}
                  disabled={createAssessmentMutation.isPending}
                  data-testid="button-start-assessment"
                >
                  {createAssessmentMutation.isPending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Creating Assessment...
                    </>
                  ) : (
                    <>
                      Start Assessment
                      <ArrowRightIcon className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Assessment Form
          <AssessmentForm 
            assessmentId={currentAssessmentId}
            onComplete={handleAssessmentComplete}
          />
        )}
      </div>
    </div>
  );
}
