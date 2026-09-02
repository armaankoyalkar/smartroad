import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { FullPageLoader } from "@/components/ui/LoadingState";
import { loginRedirect } from "./redirects";
import { useAuth } from "./useAuth";

/**
 * Renders its children (or the nested route) only for signed-in users.
 * Anonymous visitors are sent to /login with `returnTo` so they come back afterwards.
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader label="Restoring your session" />;
  if (status === "anonymous") {
    return (
      <Navigate to={loginRedirect(location.pathname, location.search)} replace state={{ from: location }} />
    );
  }
  return children ?? <Outlet />;
}
