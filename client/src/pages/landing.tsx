import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumButton, PremiumCard, StatusBadge } from "@/components/premium";
import {
  ChartLineIcon,
  ClockIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UsersIcon,
  FileTextIcon,
  BrainIcon,
  Sparkles,
  UserPlus,
  LogIn
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="glass-effect border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-premium">
                <ChartLineIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ScaleMap</h1>
                <p className="text-sm text-white/80">Growth Bottleneck Intelligence</p>
              </div>
            </div>

            <PremiumButton
              variant="secondary"
              data-testid="button-login"
              onClick={() => window.location.href = '/auth'}
              icon={<LogIn className="w-4 h-4" />}
            >
              Get Started
            </PremiumButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <StatusBadge variant="analysis" className="mb-6" data-testid="badge-category">
            AI-Powered Growth Intelligence
          </StatusBadge>

          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-up">
            Transform Your Business Growth
            <span className="text-gradient-primary block mt-2">in 72 Hours</span>
          </h2>

          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-12 animate-fade-up" style={{ animationDelay: '200ms' }}>
            ScaleMap delivers McKinsey-quality growth bottleneck analysis with luxury consulting aesthetics.
            Get executive-level insights and implementation roadmaps in 72 hours, not 8 weeks.
          </p>

          {/* Dual CTA Strategy - Premium Design */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <PremiumButton
              variant="primary"
              size="xl"
              data-testid="button-start-assessment"
              onClick={() => window.location.href = '/auth'}
              icon={<UserPlus className="w-5 h-5" />}
              className="group"
            >
              Create Account
              <span className="text-sm opacity-80 block">Get Started</span>
            </PremiumButton>

            <PremiumButton
              variant="secondary"
              size="xl"
              data-testid="button-login"
              onClick={() => window.location.href = '/auth?mode=login'}
              icon={<LogIn className="w-5 h-5" />}
              className="group"
            >
              Login
              <span className="text-sm opacity-80 block">Welcome Back</span>
            </PremiumButton>
          </div>

          {/* Learn More - Scrolls to features */}
          <PremiumButton
            variant="ghost"
            size="md"
            data-testid="button-learn-more"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            icon={<Sparkles className="w-4 h-4" />}
            className="text-white/80 hover:text-white animate-fade-up"
            style={{ animationDelay: '600ms' }}
          >
            Learn More
          </PremiumButton>

          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PremiumCard
              variant="glassmorphism"
              interactive
              className="text-center animate-slide-up"
              data-testid="card-feature-speed"
              style={{ animationDelay: '800ms' }}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto premium-glow-purple">
                  <ClockIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">72-Hour Delivery</h3>
                <p className="text-white/70 leading-relaxed">
                  Comprehensive analysis and implementation kits delivered in 3 days, not 3 months.
                </p>
                <StatusBadge variant="excellent" size="sm">
                  Enterprise Speed
                </StatusBadge>
              </div>
            </PremiumCard>

            <PremiumCard
              variant="glassmorphism"
              interactive
              glow
              className="text-center animate-slide-up"
              data-testid="card-feature-ai"
              style={{ animationDelay: '1000ms' }}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto premium-glow-blue">
                  <BrainIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">12 AI Specialists</h3>
                <p className="text-white/70 leading-relaxed">
                  Domain experts analyze your operations across all critical business functions.
                </p>
                <StatusBadge variant="analysis" size="sm">
                  AI-Powered
                </StatusBadge>
              </div>
            </PremiumCard>

            <PremiumCard
              variant="glassmorphism"
              interactive
              className="text-center animate-slide-up"
              data-testid="card-feature-results"
              style={{ animationDelay: '1200ms' }}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center mx-auto shadow-premium">
                  <TrendingUpIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">20%+ Growth</h3>
                <p className="text-white/70 leading-relaxed">
                  70% of clients achieve 20%+ growth acceleration within 90 days of implementation.
                </p>
                <StatusBadge variant="excellent" size="sm">
                  Proven Results
                </StatusBadge>
              </div>
            </PremiumCard>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 px-6 bg-secondary/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Perfect Prioritization in 3 Steps
            </h3>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our AI-powered process identifies the 2-3 operational changes that unlock 80% of your growth potential.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="relative" data-testid="card-step-assess">
              <div className="absolute -top-4 left-6">
                <Badge className="bg-primary text-primary-foreground px-4 py-2">Step 1</Badge>
              </div>
              <CardHeader className="pt-8">
                <UsersIcon className="w-10 h-10 text-primary mb-4" />
                <CardTitle>12-Domain Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Complete our comprehensive operational assessment covering strategy, finance, 
                  operations, people, and technology domains.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Strategic alignment & vision clarity</li>
                  <li>• Financial management & capital efficiency</li>
                  <li>• Revenue engine optimization</li>
                  <li>• Operational excellence & processes</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative" data-testid="card-step-analyze">
              <div className="absolute -top-4 left-6">
                <Badge className="bg-primary text-primary-foreground px-4 py-2">Step 2</Badge>
              </div>
              <CardHeader className="pt-8">
                <BrainIcon className="w-10 h-10 text-primary mb-4" />
                <CardTitle>AI Analysis Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  12 specialist AI agents analyze your operations using proven consulting frameworks 
                  and industry benchmarks.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Domain-specific expert analysis</li>
                  <li>• Cross-functional impact modeling</li>
                  <li>• Priority bottleneck identification</li>
                  <li>• Implementation complexity scoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="relative" data-testid="card-step-implement">
              <div className="absolute -top-4 left-6">
                <Badge className="bg-primary text-primary-foreground px-4 py-2">Step 3</Badge>
              </div>
              <CardHeader className="pt-8">
                <FileTextIcon className="w-10 h-10 text-primary mb-4" />
                <CardTitle>Implementation Accelerator</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Receive detailed implementation playbooks, templates, and 90-day execution 
                  roadmaps for maximum impact.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Priority-ranked action plans</li>
                  <li>• Ready-to-use templates & tools</li>
                  <li>• Change management guidance</li>
                  <li>• Success metrics & tracking</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Enterprise Results, Startup Speed
            </h3>
            <p className="text-xl text-muted-foreground">
              Get McKinsey-quality analysis at a fraction of the cost and time.
            </p>
          </div>

          <Card className="relative overflow-hidden" data-testid="card-pricing">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-6 py-2 text-sm font-semibold">
              Most Popular
            </div>
            
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Complete Growth Analysis</CardTitle>
              <div className="text-4xl font-bold text-primary">
                £7,500
                <span className="text-base font-normal text-muted-foreground ml-2">one-time</span>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-foreground">What's Included:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center">
                      <ShieldCheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      12-domain operational assessment
                    </li>
                    <li className="flex items-center">
                      <ShieldCheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      AI-powered bottleneck analysis
                    </li>
                    <li className="flex items-center">
                      <ShieldCheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      24hr executive summary
                    </li>
                    <li className="flex items-center">
                      <ShieldCheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      48hr detailed analysis report
                    </li>
                    <li className="flex items-center">
                      <ShieldCheckIcon className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      72hr implementation accelerator kits
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3 text-foreground">Compare Traditional Consulting:</h4>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex justify-between">
                        <span>Traditional Cost:</span>
                        <span className="line-through">£50,000+</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Traditional Timeline:</span>
                        <span className="line-through">6-8 weeks</span>
                      </div>
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>ScaleMap Cost:</span>
                        <span>£7,500</span>
                      </div>
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>ScaleMap Timeline:</span>
                        <span>72 hours</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8" 
                  data-testid="button-get-started"
                  onClick={() => window.location.href = '/auth'}
                >
                  Get Started Now
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  30-day money-back guarantee • Secure payment processing
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <ChartLineIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">ScaleMap</span>
          </div>
          <p className="text-muted-foreground">
            © 2025 ScaleMap. All rights reserved. Growth Bottleneck Intelligence Platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
