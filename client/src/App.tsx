import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Auth from "@/pages/auth";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Assessment from "@/pages/assessment";
import Dashboard from "@/pages/dashboard";
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
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/profile" component={Profile} />
          <Route path="/assessment" component={Assessment} />
          <Route path="/dashboard/:id" component={Dashboard} />
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
