"use client";
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-50 p-8 text-red-500 font-mono text-sm border-2 border-red-500">
          <div>
            <h1 className="text-xl font-bold mb-4">Rendering Error</h1>
            <pre className="whitespace-pre-wrap max-w-2xl bg-black p-4 rounded overflow-auto max-h-[50vh]">
              {this.state.error?.message}
              {this.state.error?.stack}
            </pre>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => this.setState({ hasError: false })}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
