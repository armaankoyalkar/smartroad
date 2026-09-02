/**
 * Authentication state. The JWT lives in localStorage under one key (config.tokenStorageKey);
 * the user object lives here. On load the session is restored through GET /api/auth/me.
 * The context object itself is in ./context.ts; read it with useAuth().
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMe } from "@/api/auth";
import { AUTH_EVENT, isApiError, tokenStore } from "@/api/client";
import type { User } from "@/types/api";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./context";

export type { AuthContextValue, AuthStatus } from "./context";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
}

const ANONYMOUS: AuthState = { status: "anonymous", user: null, token: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(() => {
    const token = tokenStore.get();
    return token ? { status: "loading", user: null, token } : ANONYMOUS;
  });

  const dropServerCache = useCallback(() => {
    // Meta (categories, enums) is public and identical for every viewer; everything else is user-scoped.
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "meta" });
  }, [queryClient]);

  const refresh = useCallback(async (): Promise<User | null> => {
    const token = tokenStore.get();
    if (!token) {
      setState(ANONYMOUS);
      return null;
    }
    try {
      const user = await getMe();
      setState({ status: "authenticated", user, token });
      return user;
    } catch (error) {
      if (isApiError(error) && error.isNetworkError) {
        // The server is unreachable: keep the token for a later retry but do not pretend to be signed in.
        setState({ status: "anonymous", user: null, token });
      } else {
        tokenStore.clear();
        setState(ANONYMOUS);
      }
      return null;
    }
  }, []);

  // Restore the session once on mount when a token exists.
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    getMe()
      .then((user) => {
        if (!cancelled) setState({ status: "authenticated", user, token: tokenStore.get() });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isApiError(error) && error.isNetworkError) {
          setState({ status: "anonymous", user: null, token: tokenStore.get() });
        } else {
          tokenStore.clear();
          setState(ANONYMOUS);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client clears the token on 401 from /auth/me; mirror that here.
  useEffect(() => {
    const onUnauthorized = () => {
      setState(ANONYMOUS);
      dropServerCache();
    };
    window.addEventListener(AUTH_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_EVENT, onUnauthorized);
  }, [dropServerCache]);

  const login = useCallback(
    (token: string, user: User) => {
      tokenStore.set(token);
      dropServerCache();
      setState({ status: "authenticated", user, token });
    },
    [dropServerCache],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    dropServerCache();
    setState(ANONYMOUS);
  }, [dropServerCache]);

  const updateUser = useCallback((user: User) => {
    setState((s) => ({ ...s, user }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      token: state.token,
      isAuthenticated: state.status === "authenticated",
      isAdmin: state.status === "authenticated" && state.user?.role === "admin",
      login,
      logout,
      updateUser,
      refresh,
    }),
    [state, login, logout, updateUser, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
