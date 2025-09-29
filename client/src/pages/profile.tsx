import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChartLineIcon,
  BuildingIcon,
  UsersIcon,
  DollarSignIcon,
  Factory,
  CheckIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";

const profileSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  revenue: z.string().min(1, "Revenue range is required"),
  teamSize: z.number().min(1, "Team size must be at least 1"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const INDUSTRIES = [
  "Technology",
  "Financial Services",
  "Healthcare",
  "E-commerce",
  "Manufacturing",
  "Professional Services",
  "Real Estate",
  "Education",
  "Media & Entertainment",
  "Food & Beverage",
  "Retail",
  "Transportation",
  "Energy",
  "Non-profit",
  "Other"
];

const REVENUE_RANGES = [
  "Under £500K",
  "£500K - £1M",
  "£1M - £5M", 
  "£5M - £10M",
  "£10M - £25M",
  "£25M - £50M",
  "£50M - £100M",
  "£100M+"
];

export default function Profile() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated - using router navigation
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Session Required",
        description: "Please log in to edit your profile.",
        variant: "destructive",
      });
      setLocation('/auth');
    }
  }, [isAuthenticated, authLoading, toast, setLocation]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      companyName: "",
      industry: "",
      revenue: "",
      teamSize: 1,
    },
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      form.reset({
        companyName: user.companyName || "",
        industry: user.industry || "",
        revenue: user.revenue || "",
        teamSize: user.teamSize || 1,
      });
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("PUT", "/api/user/profile", data);
    },
    onSuccess: async (response) => {
      const updatedUser = await response.json();
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      toast({
        title: "Profile Updated",
        description: "Your company profile has been saved successfully.",
      });
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
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
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
                  {user?.companyName || "Setup Profile"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Complete Your Company Profile
          </h2>
          <p className="text-muted-foreground">
            Help us provide more accurate analysis by sharing some details about your company.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card data-testid="card-profile-form">
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Company Name */}
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <BuildingIcon className="w-4 h-4 mr-2" />
                            Company Name
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your company name" 
                              data-testid="input-company-name"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Industry */}
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <Factory className="w-4 h-4 mr-2" />
                            Industry
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-industry">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDUSTRIES.map((industry) => (
                                <SelectItem key={industry} value={industry}>
                                  {industry}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Revenue Range */}
                    <FormField
                      control={form.control}
                      name="revenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <DollarSignIcon className="w-4 h-4 mr-2" />
                            Annual Revenue
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-revenue">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select revenue range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {REVENUE_RANGES.map((range) => (
                                <SelectItem key={range} value={range}>
                                  {range}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Team Size */}
                    <FormField
                      control={form.control}
                      name="teamSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <UsersIcon className="w-4 h-4 mr-2" />
                            Team Size
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              placeholder="Enter number of employees"
                              data-testid="input-team-size"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <div className="flex items-center space-x-4">
                      <Button 
                        type="submit" 
                        size="lg"
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckIcon className="w-4 h-4 mr-2" />
                            Save Profile
                          </>
                        )}
                      </Button>
                      
                      <Button variant="outline" asChild data-testid="button-back-home">
                        <Link href="/">
                          Back to Dashboard
                        </Link>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card data-testid="card-why-needed">
              <CardHeader>
                <CardTitle className="text-lg">Why We Need This</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Industry-Specific Analysis</p>
                    <p className="text-xs text-muted-foreground">
                      Tailored questions and benchmarks for your sector
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Size-Appropriate Recommendations</p>
                    <p className="text-xs text-muted-foreground">
                      Solutions that match your company's scale
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Relevant Benchmarking</p>
                    <p className="text-xs text-muted-foreground">
                      Compare against similar companies
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20" data-testid="card-next-steps">
              <CardHeader>
                <CardTitle className="text-lg">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Once your profile is complete, you'll be able to start your comprehensive 
                  growth analysis assessment.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                    <span>Complete profile setup</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <div className="w-4 h-4 border border-muted-foreground rounded mr-2"></div>
                    <span>Start 12-domain assessment</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <div className="w-4 h-4 border border-muted-foreground rounded mr-2"></div>
                    <span>Receive AI analysis</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
