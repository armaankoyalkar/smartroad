import { useUser } from "@/api/queries";
import { Avatar } from "@/components/ui/Avatar";
import { Drawer } from "@/components/ui/Drawer";
import { ErrorState } from "@/components/ui/ErrorState";
import { StatusBadge } from "@/components/ui/SemanticBadges";
import { Skeleton } from "@/components/ui/Skeleton";
import { STATUSES } from "@/constants/enums";
import { EM_DASH, formatDateTime, formatNumber } from "@/utils/format";
import { RoleBadge } from "./UsersTable";

export interface UserDetailDrawerProps {
  userId: string | null;
  onClose: () => void;
}

/** One user (GET /api/users/:id) with the incident counts by status. */
export function UserDetailDrawer({ userId, onClose }: UserDetailDrawerProps) {
  const query = useUser(userId ?? undefined);
  const user = query.data;

  return (
    <Drawer open={userId !== null} onClose={onClose} title={user ? user.name : "User"} side="right" size="lg">
      {query.isLoading && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {query.error && <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />}
      {user && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-medium text-text">{user.name}</p>
              <a
                href={`mailto:${user.email}`}
                className="block truncate text-sm text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                {user.email}
              </a>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">Role</dt>
            <dd>
              <RoleBadge role={user.role} />
            </dd>
            <dt className="text-muted">Account</dt>
            <dd className={user.isActive ? "text-green-300" : "text-red-300"}>
              {user.isActive ? "Active" : "Deactivated"}
            </dd>
            <dt className="text-muted">Phone</dt>
            <dd className="text-text">{user.phone ?? EM_DASH}</dd>
            <dt className="text-muted">Joined</dt>
            <dd className="text-text">{formatDateTime(user.createdAt)}</dd>
            <dt className="text-muted">Incidents</dt>
            <dd className="tabular text-text">{formatNumber(user.incidentCount)}</dd>
          </dl>
          <section aria-labelledby="user-incidents-heading" className="space-y-2">
            <h3 id="user-incidents-heading" className="text-sm font-semibold text-text">
              Incidents by status
            </h3>
            <ul className="divide-y divide-navy-600/60 rounded-lg border border-navy-600">
              {STATUSES.map((status) => (
                <li key={status} className="flex items-center justify-between px-3 py-2 text-sm">
                  <StatusBadge status={status} size="sm" />
                  <span className="tabular text-text">
                    {formatNumber(user.incidentsByStatus?.[status] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Drawer>
  );
}
