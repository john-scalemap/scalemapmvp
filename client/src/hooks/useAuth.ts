import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { cognitoAuth } from "@/lib/cognitoAuth";
import { API_BASE_URL } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();

  // Check if we have a token BEFORE the query runs
  // This prevents the race condition on page refresh
  const hasToken = cognitoAuth.isAuthenticated();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = cognitoAuth.getCurrentToken();
      if (!token || !cognitoAuth.isAuthenticated()) {
        throw new Error('No valid token');
      }

      // Use absolute URL with API_BASE_URL to ensure correct backend endpoint
      const fullUrl = `${API_BASE_URL}/api/auth/user`;

      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      return response.json();
    },
    retry: false,
    enabled: hasToken,
  });

  const signOut = async () => {
    await cognitoAuth.signOut();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    window.location.href = '/';
  };

  return {
    user,
    // If we have a token and query is loading, keep isLoading true
    // This prevents redirect during the user fetch
    isLoading: hasToken && isLoading,
    // Only authenticated if we have valid token AND (still loading OR have user data)
    isAuthenticated: hasToken && (isLoading || !!user),
    signOut,
    signIn: cognitoAuth.signIn.bind(cognitoAuth),
    signUp: cognitoAuth.signUp.bind(cognitoAuth),
    confirmRegistration: cognitoAuth.confirmRegistration.bind(cognitoAuth),
    forgotPassword: cognitoAuth.forgotPassword.bind(cognitoAuth),
    confirmPassword: cognitoAuth.confirmPassword.bind(cognitoAuth),
  };
}
