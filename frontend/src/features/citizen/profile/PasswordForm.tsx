import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { isApiError } from "@/api/client";
import { useChangePassword } from "@/api/mutations";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/Input";
import { useToast } from "@/components/ui/useToast";
import { authErrorMessage } from "@/features/public/auth/authErrors";
import { PasswordStrengthHint } from "@/features/public/auth/PasswordStrengthHint";
import { applyServerErrors } from "@/utils/formErrors";
import { passwordChangeSchema, type PasswordChangeFormValues } from "@/utils/validation";

const EMPTY: PasswordChangeFormValues = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Change password (PATCH /api/users/me/password). A wrong current password is shown on that field. */
export function PasswordForm() {
  const changePassword = useChangePassword();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: EMPTY,
    mode: "onTouched",
  });
  const newPassword = useWatch({ control, name: "newPassword" }) ?? "";

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset(EMPTY);
      toast.success("Password changed", { description: "Use the new password the next time you sign in." });
    } catch (error) {
      if (isApiError(error) && error.code === "INVALID_CREDENTIALS") {
        setError("currentPassword", { type: "server", message: "The current password is incorrect." });
        return;
      }
      if (isApiError(error) && error.isValidation) {
        setFormError(applyServerErrors(error, setError, { fields: ["currentPassword", "newPassword"] }));
        return;
      }
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5"
      aria-busy={changePassword.isPending || undefined}
    >
      <Field label="Current password" required error={errors.currentPassword?.message}>
        <PasswordInput autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label="New password" required error={errors.newPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register("newPassword")} />
      </Field>
      <PasswordStrengthHint password={newPassword} />
      <Field label="Confirm new password" required error={errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <FormError message={formError} />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="secondary"
          loading={changePassword.isPending}
          loadingText="Changing…"
          leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
        >
          Change password
        </Button>
      </div>
    </form>
  );
}
