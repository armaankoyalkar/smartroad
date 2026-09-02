import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { safeReturnTo } from "@/auth/redirects";
import { useAuth } from "@/auth/useAuth";
import { Alert } from "@/components/ui/Alert";
import { Button, LinkButton } from "@/components/ui/Button";
import { useToast } from "@/components/ui/useToast";
import { AuthCard } from "@/features/public/auth/AuthCard";
import { LoginForm } from "@/features/public/auth/LoginForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { User } from "@/types/api";

const LINK =
  "font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

/**
 * Administrator sign-in: the same form and endpoint as /login in an admin-styled card.
 * A citizen account that signs in here is told so and offered the citizen area (FR-A8).
 */
export default function AdminLoginPage() {
  useDocumentTitle("Administrator sign-in");
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [nonAdmin, setNonAdmin] = useState<User | null>(null);
  const returnTo = searchParams.get("returnTo");

  if (isAuthenticated && isAdmin) return <Navigate to={safeReturnTo(returnTo, "/admin")} replace />;
  const citizen = nonAdmin ?? (isAuthenticated && !isAdmin ? user : null);

  return (
    <AuthCard
      admin
      eyebrow="Administrator sign-in"
      title="Administrator sign-in"
      description="For road-authority staff who verify reports, set priorities and study the analytics."
      footer={
        <p>
          Not an administrator?{" "}
          <Link to="/login" className={LINK}>
            Citizen sign-in
          </Link>
        </p>
      }
    >
      {citizen ? (
        <div className="space-y-4">
          <Alert tone="warning" role="alert" icon={ShieldAlert} title="This account is not an administrator">
            {citizen.name} is signed in as a citizen. Administrator accounts are created by the project team,
            not through registration.
          </Alert>
          <div className="flex flex-col gap-2 sm:flex-row">
            <LinkButton to="/app" fullWidth>
              Go to the citizen area
            </LinkButton>
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                logout();
                setNonAdmin(null);
              }}
            >
              Sign in with another account
            </Button>
          </div>
        </div>
      ) : (
        <LoginForm
          variant="admin"
          onSuccess={(data) => {
            if (data.user.role === "admin") {
              toast.success(`Welcome back, ${data.user.name}.`);
              navigate(safeReturnTo(returnTo, "/admin"), { replace: true });
            } else {
              setNonAdmin(data.user);
            }
          }}
        />
      )}
    </AuthCard>
  );
}
