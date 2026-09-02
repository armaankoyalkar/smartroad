/**
 * Quick status and priority changes from the incident list rows. Errors are surfaced as
 * toasts; an INVALID_TRANSITION answer refreshes the list because the row was stale.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage, isApiError } from "@/api/client";
import { useChangeStatus, useSetPriority } from "@/api/mutations";
import { queryKeys } from "@/api/queryKeys";
import { useToast } from "@/components/ui/useToast";
import { PRIORITY_UNASSIGNED_LABEL, type IncidentStatus, type Priority } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { Incident } from "@/types/api";

export function useIncidentQuickActions() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const changeStatus = useChangeStatus();
  const setPriority = useSetPriority();
  const toast = useToast();
  const meta = useMeta();
  const queryClient = useQueryClient();

  const fail = (error: unknown) => {
    toast.error("Change not applied", { description: getErrorMessage(error) });
    if (isApiError(error) && error.code === "INVALID_TRANSITION") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all });
    }
  };

  /** Resolves to true when the change was applied. */
  const applyStatus = async (incident: Incident, status: IncidentStatus, note?: string): Promise<boolean> => {
    setPendingId(incident.id);
    try {
      await changeStatus.mutateAsync({ id: incident.id, input: note ? { status, note } : { status } });
      toast.success(`Status changed to ${meta.label("status", status)}`, { description: incident.title });
      return true;
    } catch (error) {
      fail(error);
      return false;
    } finally {
      setPendingId(null);
    }
  };

  const applyPriority = async (incident: Incident, priority: Priority | null): Promise<boolean> => {
    setPendingId(incident.id);
    try {
      await setPriority.mutateAsync({ id: incident.id, input: { priority } });
      toast.success(
        priority
          ? `Priority set to ${meta.label("priority", priority)}`
          : `Priority ${PRIORITY_UNASSIGNED_LABEL.toLowerCase()}`,
        { description: incident.title },
      );
      return true;
    } catch (error) {
      fail(error);
      return false;
    } finally {
      setPendingId(null);
    }
  };

  return { pendingId, applyStatus, applyPriority };
}
