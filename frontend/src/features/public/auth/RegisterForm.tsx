import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link } from "react-router";
import { isApiError } from "@/api/client";
import { useRegister } from "@/api/mutations";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { Input, PasswordInput } from "@/components/ui/Input";
import type { AuthResponse } from "@/types/api";
import { applyServerErrors } from "@/utils/formErrors";
import { registerSchema, type RegisterFormValues } from "@/utils/validation";
import { authErrorMessage } from "./authErrors";
import { PasswordStrengthHint } from "./PasswordStrengthHint";

export interface RegisterFormProps {
  onSuccess: (data: AuthResponse) => void;
}

const FIELDS = ["name", "email", "password", "confirmPassword", "phone"] as const;
const LINK =
  "font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

/** Citizen registration (POST /api/auth/register). Admin accounts are never created here. */
export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const registerAccount = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", phone: "" },
    mode: "onTouched",
  });
  const password = useWatch({ control, name: "password" }) ?? "";

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const data = await registerAccount.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
      });
      onSuccess(data);
    } catch (error) {
      if (isApiError(error) && error.code === "EMAIL_TAKEN") {
        setError("email", {
          type: "emailTaken",
          message: error.message || "This email is already registered.",
        });
        return;
      }
      if (isApiError(error) && error.isValidation) {
        setFormError(applyServerErrors(error, setError, { fields: FIELDS }));
        return;
      }
      setFormError(authErrorMessage(error));
    }
  });

  const emailError =
    errors.email?.type === "emailTaken" ? (
      <>
        {errors.email.message}{" "}
        <Link to="/login" className={LINK}>
          Sign in instead
        </Link>
      </>
    ) : (
      errors.email?.message
    );

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5"
      aria-busy={registerAccount.isPending || undefined}
    >
      <Field label="Full name" required error={errors.name?.message} hint="2 to 80 characters.">
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="Email" required error={emailError}>
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
        />
      </Field>
      <Field
        label="Phone"
        showOptional
        error={errors.phone?.message}
        hint="10 to 15 digits, optionally starting with +. Only administrators can see it."
      >
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+919876543210"
          {...register("phone")}
        />
      </Field>
      <Field label="Password" required error={errors.password?.message}>
        <PasswordInput autoComplete="new-password" {...register("password")} />
      </Field>
      <PasswordStrengthHint password={password} />
      <Field label="Confirm password" required error={errors.confirmPassword?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
      </Field>
      <FormError message={formError} />
      <Button
        type="submit"
        fullWidth
        loading={registerAccount.isPending}
        loadingText="Creating your account…"
        leftIcon={<UserPlus className="h-4 w-4" aria-hidden="true" />}
      >
        Create account
      </Button>
      <p className="text-xs text-muted">
        By registering you agree that reports you submit are shown on the public map without your name.
      </p>
    </form>
  );
}
