/**
 * TanStack Query mutation hooks for every write endpoint, with cache invalidation.
 * Auth mutations update AuthContext on success; the calling page handles navigation and toasts.
 */
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { login, register } from "./auth";
import {
  changeIncidentStatus,
  createIncident,
  deleteIncident,
  setIncidentPriority,
  updateIncident,
} from "./incidents";
import { estimateRisk, refreshRisk } from "./ml";
import { queryKeys } from "./queryKeys";
import { changePassword, updateMe, updateUser } from "./users";
import type {
  Incident,
  IncidentCreateInput,
  IncidentUpdateInput,
  PriorityChangeInput,
  StatusChangeInput,
  UpdateUserInput,
} from "@/types/api";

/** Everything derived from incidents: lists, details, analytics, map layers and risk counts. */
export function invalidateIncidentData(queryClient: QueryClient): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.map.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.ml.distribution }),
  ]).then(() => undefined);
}

function useIncidentWrite() {
  const queryClient = useQueryClient();
  return (incident: Incident) => {
    queryClient.setQueryData(queryKeys.incidents.detail(incident.id), incident);
    return invalidateIncidentData(queryClient);
  };
}

// ------------------------------------------------------------------ auth

export function useLogin() {
  const auth = useAuth();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => auth.login(data.token, data.user),
  });
}

export function useRegister() {
  const auth = useAuth();
  return useMutation({
    mutationFn: register,
    onSuccess: (data) => auth.login(data.token, data.user),
  });
}

// ------------------------------------------------------------------ profile and users

export function useUpdateMe() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => {
      auth.updateUser(user);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.users.detail(user.id), (prev: unknown) =>
        prev && typeof prev === "object" ? { ...prev, ...user } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

// ------------------------------------------------------------------ incidents

export function useCreateIncident() {
  const write = useIncidentWrite();
  return useMutation({
    mutationFn: (input: IncidentCreateInput) => createIncident(input),
    onSuccess: (incident) => write(incident),
  });
}

export function useUpdateIncident() {
  const write = useIncidentWrite();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IncidentUpdateInput }) => updateIncident(id, input),
    onSuccess: (incident) => write(incident),
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: queryKeys.incidents.detail(result.id) });
      return invalidateIncidentData(queryClient);
    },
  });
}

export function useChangeStatus() {
  const write = useIncidentWrite();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StatusChangeInput }) => changeIncidentStatus(id, input),
    onSuccess: (incident) => write(incident),
  });
}

export function useSetPriority() {
  const write = useIncidentWrite();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PriorityChangeInput }) => setIncidentPriority(id, input),
    onSuccess: (incident) => write(incident),
  });
}

// ------------------------------------------------------------------ ml (admin)

export function useEstimateRisk() {
  return useMutation({ mutationFn: estimateRisk });
}

export function useRefreshRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshRisk,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.ml.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.incidents.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.map.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all }),
      ]).then(() => undefined),
  });
}
