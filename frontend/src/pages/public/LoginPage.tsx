import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { safeReturnTo } from "@/auth/redirects";
import { useAuth } from "@/auth/useAuth";
import { useToast } from "@/components/ui/useToast";
import { AuthCard } from "@/features/public/auth/AuthCard";
import { LoginForm } from "@/features/public/auth/LoginForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const LINK =
  "font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

/** Citizen sign-in. Admins who sign in here are sent to /admin; `returnTo` is honoured when safe. */
export default function LoginPage() {
  useDocumentTitle("Sign in");
  const { isAuthenticated, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const returnTo = searchParams.get("returnTo");

  if (isAuthenticated) return <Navigate to={safeReturnTo(returnTo, isAdmin ? "/admin" : "/app")} replace />;

  return (
    <AuthCard
      eyebrow="Citizen sign-in"
      title="Welcome back"
      description="Sign in to report an incident and follow what happens to your reports."
      footer={
        <>
          <p>
            New to SmartRoad?{" "}
            <Link to="/register" className={LINK}>
              Create an account
            </Link>
          </p>
          <p>
            <Link to="/admin/login" className={LINK}>
              Administrator sign-in
            </Link>
          </p>
        </>
      }
    >
      <LoginForm
        onSuccess={(data) => {
          toast.success(`Welcome back, ${data.user.name}.`);
          navigate(safeReturnTo(returnTo, data.user.role === "admin" ? "/admin" : "/app"), { replace: true });
        }}
      />
    </AuthCard>
  );
}
