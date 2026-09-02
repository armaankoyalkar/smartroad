import { useEffect, type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { FullPageLoader } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/useToast";
import type { Role } from "@/constants/enums";
import { loginRedirect } from "./redirects";
import { useAuth } from "./useAuth";

interface RequireRoleProps {
  role?: Role;
  /** Where users without the role are sent (default: the citizen area). */
  fallbackTo?: string;
  children?: ReactNode;
}

/**
 * Role gate. Citizens who open an admin URL are sent to /app with a toast explaining why.
 * This only hides pages; the API enforces permissions on every request.
 */
export function RequireRole({ role = "admin", fallbackTo = "/app", children }: RequireRoleProps) {
  const { status, user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const allowed = status === "authenticated" && user?.role === role;
  const denied = status === "authenticated" && !allowed;

  useEffect(() => {
    if (denied) {
      toast.warning("That area is for administrators only.", {
        id: "require-role",
        description: "You have been taken to your dashboard instead.",
      });
    }
  }, [denied, toast]);

  if (status === "loading") return <FullPageLoader label="Checking your access" />;
  if (status === "anonymous") {
    return (
      <Navigate to={loginRedirect(location.pathname, location.search)} replace state={{ from: location }} />
    );
  }
  if (!allowed) return <Navigate to={fallbackTo} replace />;
  return children ?? <Outlet />;
}
