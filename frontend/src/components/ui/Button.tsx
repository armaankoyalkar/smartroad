import type { ComponentPropsWithRef, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./buttonStyles";
import { Spinner } from "./Spinner";

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button, shows a spinner and sets aria-busy. */
  loading?: boolean;
  /** Text shown instead of children while loading. */
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" decorative /> : leftIcon}
      {loading && loadingText ? loadingText : children}
      {!loading && rightIcon}
    </button>
  );
}

export interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/** A react-router Link styled as a button (for navigation, never for actions). */
export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={buttonClasses({ variant, size, fullWidth, className: className as string | undefined })}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}

export interface IconButtonProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  /** Accessible name; also used as the tooltip title. */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  loading = false,
  className,
  disabled,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={buttonClasses({ variant, size, iconOnly: true, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="sm" decorative /> : icon}
    </button>
  );
}
