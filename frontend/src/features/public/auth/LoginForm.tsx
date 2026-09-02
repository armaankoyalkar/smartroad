import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { isApiError } from "@/api/client";
import { useLogin } from "@/api/mutations";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { Input, PasswordInput } from "@/components/ui/Input";
import type { AuthResponse } from "@/types/api";
import { applyServerErrors } from "@/utils/formErrors";
import { loginSchema, type LoginFormValues } from "@/utils/validation";
import { authErrorMessage } from "./authErrors";

export interface LoginFormProps {
  /** Called after AuthContext has stored the session. */
  onSuccess: (data: AuthResponse) => void;
  /** Administrator styling and wording. */
  variant?: "citizen" | "admin";
}

/**
 * Email + password form shared by /login and /admin/login. Uses POST /api/auth/login through
 * useLogin (which stores the session); server errors are shown under the form, never as hints
 * about which part of the credentials was wrong.
 */
export function LoginForm({ onSuccess, variant = "citizen" }: LoginFormProps) {
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const data = await login.mutateAsync({ email: values.email.trim(), password: values.password });
      onSuccess(data);
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        const message = applyServerErrors(error, setError, { fields: ["email", "password"] });
        setFormError(message);
        return;
      }
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-busy={login.isPending || undefined}>
      <Field label="Email" required error={errors.email?.message}>
        <Input
          type="email"
          autoComplete={variant === "admin" ? "username" : "email"}
          inputMode="email"
          placeholder="you@example.com"
          {...register("email")}
        />
      </Field>
      <Field label="Password" required error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...register("password")} />
      </Field>
      <FormError message={formError} />
      <Button
        type="submit"
        fullWidth
        loading={login.isPending}
        loadingText="Signing in…"
        leftIcon={<LogIn className="h-4 w-4" aria-hidden="true" />}
      >
        {variant === "admin" ? "Sign in as administrator" : "Sign in"}
      </Button>
    </form>
  );
}
