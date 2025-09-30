import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Assessment from "@/pages/assessment";
import AssessmentDetail from "@/pages/assessment-detail";
import Checkout from "@/pages/checkout";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={Auth} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/dashboard" component={Auth} /> {/* Redirect to auth if not authenticated */}
          <Route path="/assessment/:id" component={Auth} /> {/* Redirect to auth if not authenticated */}
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} /> {/* Main authenticated landing - dashboard */}
          <Route path="/dashboard" component={Dashboard} /> {/* Dashboard route */}
          <Route path="/profile" component={Profile} />
          <Route path="/assessment" component={Assessment} /> {/* New assessment */}
          <Route path="/assessment/:id" component={AssessmentDetail} /> {/* Assessment details */}
          <Route path="/dashboard/:id" component={AssessmentDetail} /> {/* Legacy route redirect */}
          <Route path="/checkout" component={Checkout} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
