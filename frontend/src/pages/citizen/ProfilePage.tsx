import { useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/useToast";
import { AccountInfo } from "@/features/citizen/profile/AccountInfo";
import { PasswordForm } from "@/features/citizen/profile/PasswordForm";
import { ProfileForm } from "@/features/citizen/profile/ProfileForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Profile: name and phone, password change, account information and sign-out. */
export default function ProfilePage() {
  useDocumentTitle("Profile");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // RequireAuth guarantees a user here; the guard covers the brief moment before the session settles.
  if (!user) return null;

  const signOut = () => {
    logout();
    toast.info("You have signed out.");
    navigate("/", { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen area"
        title="Profile"
        description="Keep your contact details current so administrators can reach you about a report if needed."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(18rem,22rem)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Personal details"
              description="Only administrators can see your phone number."
            />
            <ProfileForm key={`${user.id}-${user.name}-${user.phone ?? ""}`} user={user} />
          </Card>
          <Card>
            <CardHeader
              title="Password"
              description="8 to 72 characters. Longer passwords are stronger; no special symbols are required."
            />
            <PasswordForm />
          </Card>
        </div>
        <AccountInfo user={user} onSignOut={signOut} />
      </div>
    </div>
  );
}
