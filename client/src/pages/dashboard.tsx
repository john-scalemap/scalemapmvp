import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Assessment } from "@shared/schema";
import {
  PlusIcon,
  FileTextIcon,
  ClockIcon,
  ChartLineIcon,
  CheckCircle2Icon,
  PlayCircleIcon,
  UploadIcon,
  TrendingUpIcon
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: assessments = [], isLoading: assessmentsLoading, error: assessmentsError } = useQuery<Assessment[]>({
    queryKey: ["/api/assessments"],
    retry: false,
    enabled: isAuthenticated && !isLoading,
  });

  // Create new assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/assessments", {});
    },
    onSuccess: async (response) => {
      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      toast({
        title: "Assessment Created",
        description: "Your growth analysis has been started.",
      });
      // Navigate to assessment page
      setLocation('/assessment');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        setLocation('/auth');
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create assessment. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (assessmentsError && isUnauthorizedError(assessmentsError as Error)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      setLocation('/auth');
    }
  }, [assessmentsError, toast, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation('/auth');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeAssessment = assessments.find((a) => a.status !== 'completed' && a.status !== 'failed');
  const completedAssessments = assessments.filter((a) => a.status === 'completed');

  // Helper function to get status info
  const getStatusInfo = (assessment: Assessment) => {
    const questionsAnswered = assessment.questionsAnswered || 0;
    const totalQuestions = assessment.totalQuestions || 120;

    switch (assessment.status) {
      case 'in_progress':
        return {
          label: 'In Progress',
          color: 'bg-blue-500',
          icon: PlayCircleIcon,
          description: `${questionsAnswered}/${totalQuestions} questions answered`
        };
      case 'pending':
        return {
          label: 'Pending Submission',
          color: 'bg-yellow-500',
          icon: UploadIcon,
          description: 'Ready to submit'
        };
      case 'awaiting_payment':
        return {
          label: 'Awaiting Payment',
          color: 'bg-orange-500',
          icon: ClockIcon,
          description: 'Payment required'
        };
      case 'paid':
        return {
          label: 'Paid',
          color: 'bg-blue-500',
          icon: CheckCircle2Icon,
          description: 'Payment received'
        };
      case 'analysis':
        return {
          label: 'Under Analysis',
          color: 'bg-purple-500',
          icon: TrendingUpIcon,
          description: 'AI analysis in progress'
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-green-500',
          icon: CheckCircle2Icon,
          description: 'Results available'
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'bg-red-500',
          icon: FileTextIcon,
          description: 'Error occurred'
        };
      default:
        return {
          label: 'Not Started',
          color: 'bg-gray-500',
          icon: FileTextIcon,
          description: 'Ready to begin'
        };
    }
  };

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
                <h1 className="text-xl font-semibold text-foreground">ScaleMap Dashboard</h1>
                <p className="text-sm text-muted-foreground">Growth Assessment Hub</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-muted-foreground">
            Manage your growth assessments and track progress
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. CREATE NEW ASSESSMENT */}
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <PlusIcon className="w-6 h-6 mr-2 text-primary" />
                  Start New Assessment
                </CardTitle>
                <CardDescription>
                  Begin your comprehensive growth bottleneck analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        30-45 mins
                      </span>
                      <span className="flex items-center">
                        <FileTextIcon className="w-4 h-4 mr-1" />
                        120 questions
                      </span>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => createAssessmentMutation.mutate()}
                    disabled={createAssessmentMutation.isPending}
                  >
                    {createAssessmentMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Start Assessment'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. RESUME IN-PROGRESS ASSESSMENT */}
            {activeAssessment && (
              <Card className="border-2 border-blue-500/30 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <PlayCircleIcon className="w-6 h-6 mr-2 text-blue-600" />
                    Assessment in Progress
                  </CardTitle>
                  <CardDescription>
                    Continue where you left off
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {activeAssessment.progress}%
                      </span>
                    </div>
                    <Progress value={activeAssessment.progress} className="h-3" />
                  </div>

                  {/* 3. STATUS GRID */}
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {/* Questionnaire Status */}
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <FileTextIcon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Questionnaire
                      </div>
                      <div className="text-sm font-semibold">
                        {activeAssessment.questionsAnswered || 0}/{activeAssessment.totalQuestions || 120}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        questions
                      </div>
                    </div>

                    {/* Documents Status */}
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <UploadIcon className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Documents
                      </div>
                      <div className="text-sm font-semibold">
                        {/* TODO: Add document count when available */}
                        Pending
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        upload
                      </div>
                    </div>

                    {/* Analysis Status */}
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <TrendingUpIcon className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Analysis
                      </div>
                      <div className="text-sm font-semibold">
                        {activeAssessment.status === 'analysis' ? 'Running' : 'Pending'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        status
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end pt-2">
                    <Button asChild size="lg">
                      <Link href={`/assessment/${activeAssessment.id}`}>
                        {activeAssessment.status === 'analysis' ? 'View Progress' : 'Continue Assessment'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Assessment History */}
            {completedAssessments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Completed Assessments</CardTitle>
                  <CardDescription>View your past assessment results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {completedAssessments.map((assessment) => {
                      const statusInfo = getStatusInfo(assessment);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div
                          key={assessment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 ${statusInfo.color} rounded-full flex items-center justify-center`}>
                              <StatusIcon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">
                                Assessment #{assessment.id}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Completed {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/assessment/${assessment.id}`}>
                              View Results
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {assessments.length === 0 && !assessmentsLoading && (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No assessments yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start your first assessment to unlock growth insights
                  </p>
                  <Button
                    size="lg"
                    onClick={() => createAssessmentMutation.mutate()}
                    disabled={createAssessmentMutation.isPending}
                  >
                    {createAssessmentMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Create First Assessment
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Assessments</span>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {assessments.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">In Progress</span>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {activeAssessment ? 1 : 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {completedAssessments.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Questions about the assessment process? We're here to help.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}