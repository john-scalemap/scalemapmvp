import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { cognitoAuth } from "@/lib/cognitoAuth";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = cognitoAuth.getCurrentToken();
      if (!token || !cognitoAuth.isAuthenticated()) {
        throw new Error('No valid token');
      }

      const response = await fetch('/api/auth/user', {
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
    enabled: cognitoAuth.isAuthenticated(),
  });

  const signOut = async () => {
    await cognitoAuth.signOut();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    window.location.href = '/';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && cognitoAuth.isAuthenticated(),
    signOut,
    signIn: cognitoAuth.signIn.bind(cognitoAuth),
    signUp: cognitoAuth.signUp.bind(cognitoAuth),
    confirmRegistration: cognitoAuth.confirmRegistration.bind(cognitoAuth),
    forgotPassword: cognitoAuth.forgotPassword.bind(cognitoAuth),
    confirmPassword: cognitoAuth.confirmPassword.bind(cognitoAuth),
  };
}
