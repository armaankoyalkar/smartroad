import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { isApiError } from "@/api/client";
import { useUpdateMe } from "@/api/mutations";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/useToast";
import type { User } from "@/types/api";
import { applyServerErrors } from "@/utils/formErrors";
import { profileSchema, type ProfileFormValues } from "@/utils/validation";
import { authErrorMessage } from "@/features/public/auth/authErrors";

/** Name and phone (PATCH /api/users/me). The email is shown read-only: it cannot be changed. */
export function ProfileForm({ user }: { user: User }) {
  const updateMe = useUpdateMe();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? "" },
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const phone = values.phone.trim();
      const updated = await updateMe.mutateAsync({ name: values.name.trim(), phone: phone ? phone : null });
      reset({ name: updated.name, phone: updated.phone ?? "" });
      toast.success("Profile updated");
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setFormError(applyServerErrors(error, setError, { fields: ["name", "phone"] }));
        return;
      }
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={updateMe.isPending || undefined}>
      <Field label="Full name" required error={errors.name?.message} hint="2 to 80 characters.">
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="Email" hint="Your email identifies your account and cannot be changed here.">
        <Input type="email" value={user.email} readOnly disabled autoComplete="email" />
      </Field>
      <Field
        label="Phone"
        showOptional
        error={errors.phone?.message}
        hint="10 to 15 digits, optionally starting with +. Leave empty to remove it."
      >
        <Input type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
      </Field>
      <FormError message={formError} />
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isDirty}
          loading={updateMe.isPending}
          loadingText="Saving…"
          leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}
