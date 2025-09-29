import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Assessment } from "@shared/schema";
import { 
  PlusIcon, 
  FileTextIcon, 
  ClockIcon,
  ChartLineIcon,
  TrendingUpIcon,
  UsersIcon
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: assessments = [], isLoading: assessmentsLoading, error: assessmentsError } = useQuery<Assessment[]>({
    queryKey: ["/api/assessments"],
    retry: false,
    enabled: isAuthenticated && !isLoading,
  });

  // Handle assessments query error - show toast but don't hard redirect
  useEffect(() => {
    if (assessmentsError && isUnauthorizedError(assessmentsError as Error)) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      // Use router navigation instead of hard redirect
      setLocation('/auth');
    }
  }, [assessmentsError, toast, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Router should handle unauthenticated state, but as a safety net redirect gracefully
  if (!isAuthenticated) {
    setLocation('/auth');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasCompletedProfile = user?.companyName && user?.industry;
  const activeAssessment = assessments.find((a) => a.status !== 'completed' && a.status !== 'failed');

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
                    {user?.companyName || "Complete Profile"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName}
          </h2>
          <p className="text-muted-foreground">
            {hasCompletedProfile ? 
              "Ready to unlock your growth potential?" : 
              "Let's get started with your growth analysis."
            }
          </p>
        </div>

        {/* Profile Completion */}
        {!hasCompletedProfile && (
          <Card className="mb-8 border-amber-200 bg-amber-50" data-testid="card-profile-incomplete">
            <CardHeader>
              <CardTitle className="text-amber-800">Complete Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-amber-700 mb-4">
                To provide the most accurate analysis, please complete your company profile.
              </p>
              <Button asChild data-testid="button-complete-profile">
                <Link href="/profile">
                  <UsersIcon className="w-4 h-4 mr-2" />
                  Complete Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Active Assessment */}
        {activeAssessment && (
          <Card className="mb-8 border-blue-200 bg-blue-50" data-testid="card-active-assessment">
            <CardHeader>
              <CardTitle className="text-blue-800">Assessment in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-700 mb-2">
                    Your growth analysis is {activeAssessment.status === 'analysis' ? 'being analyzed' : 'in progress'}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-blue-600">
                    <span>Progress: {activeAssessment.progress}%</span>
                    <span>Questions: {activeAssessment.questionsAnswered || 0}/{activeAssessment.totalQuestions}</span>
                  </div>
                </div>
                <Button asChild data-testid="button-continue-assessment">
                  <Link href={`/assessment/${activeAssessment.id}`}>
                    {activeAssessment.status === 'analysis' ? 'View Details' : 'Continue Assessment'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Start New Assessment */}
            {!activeAssessment && (
              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid="card-start-assessment">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PlusIcon className="w-5 h-5 mr-2 text-primary" />
                    Start Growth Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Begin your comprehensive 12-domain operational assessment. Get AI-powered 
                    insights and implementation roadmaps in 72 hours.
                  </p>
                  <div className="flex items-center justify-between">
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
                    <Button asChild data-testid="button-new-assessment">
                      <Link href={hasCompletedProfile ? "/assessment" : "/profile"}>
                        {hasCompletedProfile ? "Start Assessment" : "Complete Profile First"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Previous Assessments */}
            <Card data-testid="card-assessment-history">
              <CardHeader>
                <CardTitle>Assessment History</CardTitle>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No assessments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assessments.map((assessment) => (
                      <div 
                        key={assessment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        data-testid={`assessment-${assessment.id}`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              assessment.status === 'completed' ? 'default' :
                              assessment.status === 'analysis' ? 'secondary' :
                              assessment.status === 'failed' ? 'destructive' : 'outline'
                            }>
                              {assessment.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {assessment.createdAt ? new Date(assessment.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Progress: {assessment.progress}% • Questions: {assessment.questionsAnswered || 0}/{assessment.totalQuestions}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild data-testid={`button-view-${assessment.id}`}>
                          <Link href={`/assessment/${assessment.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card data-testid="card-stats">
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Profile Complete</span>
                  <Badge variant={hasCompletedProfile ? "default" : "outline"}>
                    {hasCompletedProfile ? "✓" : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assessments</span>
                  <Badge variant="outline">{assessments.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <Badge variant="outline">
                    {assessments.filter((a) => a.status === 'completed').length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Feature Highlights */}
            <Card data-testid="card-features">
              <CardHeader>
                <CardTitle className="text-lg">Why ScaleMap?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <ClockIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">72-Hour Delivery</p>
                    <p className="text-xs text-muted-foreground">Complete analysis in 3 days</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <TrendingUpIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">20%+ Growth</p>
                    <p className="text-xs text-muted-foreground">Average client acceleration</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <UsersIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">12 AI Experts</p>
                    <p className="text-xs text-muted-foreground">Domain specialist analysis</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20" data-testid="card-support">
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Our team is here to help you get the most out of your analysis.
                </p>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-contact-support">
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
