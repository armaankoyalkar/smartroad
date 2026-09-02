import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./ErrorState";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback; `reset` re-renders the children. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render errors below it so one broken view never blanks the whole app. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
    console.error("Unhandled render error", error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <ErrorState
          error={error}
          title="This view could not be displayed"
          message="An unexpected error occurred while rendering. You can try again or reload the page."
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
