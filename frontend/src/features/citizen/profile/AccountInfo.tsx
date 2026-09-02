import { LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { BRAND } from "@/constants/colors";
import { useMeta } from "@/meta/useMeta";
import type { User } from "@/types/api";
import { formatDate, formatRelative } from "@/utils/format";

export interface AccountInfoProps {
  user: User;
  onSignOut: () => void;
}

/** Role, member-since date and the sign-out button. */
export function AccountInfo({ user, onSignOut }: AccountInfoProps) {
  const meta = useMeta();
  return (
    <Card>
      <CardHeader title="Account" />
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-navy-600/60 text-sm">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">Role</dt>
          <dd>
            <Badge color={user.role === "admin" ? BRAND.secondary : BRAND.accent}>
              {meta.label("role", user.role)}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">Member since</dt>
          <dd className="text-right text-text">
            <time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time>
            <span className="block text-xs text-muted">{formatRelative(user.createdAt)}</span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-2.5">
          <dt className="text-muted">Phone</dt>
          <dd className="text-text">{user.phone ?? <span className="text-muted">Not set</span>}</dd>
        </div>
      </dl>
      <Button
        variant="outline"
        fullWidth
        className="mt-4"
        onClick={onSignOut}
        leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
      >
        Sign out
      </Button>
      <p className="mt-3 text-xs text-muted">
        Signing out removes the session from this browser. There is no email recovery: keep your password
        safe.
      </p>
    </Card>
  );
}
