import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChartLineIcon,
  CheckIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ClockIcon,
  FileTextIcon,
  BrainIcon
} from "lucide-react";
import { Link } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ assessmentId }: { assessmentId?: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/${assessmentId ? `dashboard/${assessmentId}` : ''}`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "Your assessment has been activated! Analysis will begin shortly.",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-checkout">
      <div className="bg-muted/50 rounded-lg p-4">
        <PaymentElement />
      </div>
      
      <Button 
        type="submit" 
        size="lg" 
        className="w-full"
        disabled={!stripe || !elements || isProcessing}
        data-testid="button-pay"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCardIcon className="w-4 h-4 mr-2" />
            Complete Payment - £7,500
          </>
        )}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to be logged in to make a payment.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Get assessment ID from URL params or create new assessment
      const urlParams = new URLSearchParams(window.location.search);
      const assessmentIdParam = urlParams.get('assessmentId');
      
      if (assessmentIdParam) {
        setAssessmentId(assessmentIdParam);
        // Create PaymentIntent for existing assessment
        apiRequest("POST", "/api/create-payment-intent", { 
          assessmentId: assessmentIdParam 
        })
          .then((res) => res.json())
          .then((data) => {
            setClientSecret(data.clientSecret);
          })
          .catch((error) => {
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
              description: "Failed to initialize payment. Please try again.",
              variant: "destructive",
            });
          });
      } else {
        // Create new assessment first
        apiRequest("POST", "/api/assessments", {})
          .then((res) => res.json())
          .then((assessment) => {
            setAssessmentId(assessment.id);
            return apiRequest("POST", "/api/create-payment-intent", { 
              assessmentId: assessment.id 
            });
          })
          .then((res) => res.json())
          .then((data) => {
            setClientSecret(data.clientSecret);
          })
          .catch((error) => {
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
          });
      }
    }
  }, [isAuthenticated, user, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground">Preparing Checkout</h2>
              <p className="text-sm text-muted-foreground">Setting up your payment...</p>
            </div>
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
                  {user?.companyName || "Company"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div>
            <Card className="mb-6" data-testid="card-order-summary">
              <CardHeader>
                <CardTitle>Complete Growth Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Growth Bottleneck Assessment</span>
                  <span className="font-bold">£7,500.00</span>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                    <span>12-domain operational assessment</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                    <span>AI-powered bottleneck analysis</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                    <span>24hr executive summary</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                    <span>48hr detailed analysis report</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                    <span>72hr implementation accelerator kits</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>£7,500.00</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Timeline */}
            <Card data-testid="card-delivery-timeline">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClockIcon className="w-5 h-5 mr-2" />
                  Delivery Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <FileTextIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">24 Hours: Executive Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Strategic overview with key bottlenecks identified
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <BrainIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">48 Hours: Detailed Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive domain analysis with prioritized recommendations
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">72 Hours: Implementation Kits</p>
                    <p className="text-sm text-muted-foreground">
                      Ready-to-use templates and 90-day execution roadmaps
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-4 mt-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <ShieldCheckIcon className="w-4 h-4 mr-1" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 mr-1" />
                <span>30-day Guarantee</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <Card data-testid="card-payment">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCardIcon className="w-5 h-5 mr-2" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: 'hsl(221.2, 83.2%, 53.3%)',
                        colorBackground: 'hsl(0, 0%, 100%)',
                        colorText: 'hsl(222.2, 84%, 4.9%)',
                        colorDanger: 'hsl(0, 84.2%, 60.2%)',
                        fontFamily: 'Inter, ui-sans-serif, system-ui',
                        borderRadius: '0.75rem',
                      }
                    }
                  }}
                >
                  <CheckoutForm assessmentId={assessmentId || undefined} />
                </Elements>
              </CardContent>
            </Card>

            {/* Money Back Guarantee */}
            <Card className="mt-6 bg-green-50 border-green-200" data-testid="card-guarantee">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <ShieldCheckIcon className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800">30-Day Money-Back Guarantee</h4>
                    <p className="text-sm text-green-700 mt-1">
                      If you're not completely satisfied with your analysis and recommendations, 
                      we'll refund your payment in full.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-8">
          <Button variant="outline" asChild data-testid="button-back">
            <Link href="/">
              ← Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
