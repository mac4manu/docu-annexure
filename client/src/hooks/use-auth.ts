import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

export type AuthResult = { user: User } | { restricted: true } | null;

async function fetchUser(): Promise<AuthResult> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (response.status === 403) {
    return { restricted: true };
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  const user = await response.json();
  return { user };
}

async function logout(): Promise<void> {
  window.location.href = "/api/logout";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: authResult, isLoading } = useQuery<AuthResult>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const user = authResult && "user" in authResult ? authResult.user : null;
  const isRestricted = authResult != null && "restricted" in authResult;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isRestricted,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
