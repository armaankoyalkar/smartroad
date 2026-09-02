import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { useToast } from "@/components/ui/useToast";
import { AuthCard } from "@/features/public/auth/AuthCard";
import { RegisterForm } from "@/features/public/auth/RegisterForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const LINK =
  "font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

/** Citizen registration. Signed-in visitors are sent to their dashboard. */
export default function RegisterPage() {
  useDocumentTitle("Create an account");
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  if (isAuthenticated) return <Navigate to={isAdmin ? "/admin" : "/app"} replace />;

  return (
    <AuthCard
      eyebrow="Citizen account"
      title="Create your account"
      description="An account lets you report incidents with a location and a photo, and follow each report to resolution."
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className={LINK}>
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm
        onSuccess={(data) => {
          toast.success(`Your account is ready, ${data.user.name}.`, {
            description: "You can report your first incident now.",
          });
          navigate("/app", { replace: true });
        }}
      />
    </AuthCard>
  );
}
