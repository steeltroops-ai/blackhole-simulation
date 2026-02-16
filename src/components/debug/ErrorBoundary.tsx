"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import errorTracker from "@/utils/errorTracking";
import { ErrorDisplay } from "./ErrorDisplay";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  recoveryCount: number;
  errorCode: string | null;
  errorCategory: string | null;
  errorMessage: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryCount: 0,
      errorCode: null,
      errorCategory: null,
      errorMessage: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical System Breach:", error, errorInfo);
    errorTracker.captureException(error, {
      componentStack: errorInfo.componentStack || undefined,
      isFatal: true,
    });
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={this.state.error}
          reset={this.resetError}
          errorInfo={this.state.errorInfo}
          recoveryCount={this.state.recoveryCount}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
