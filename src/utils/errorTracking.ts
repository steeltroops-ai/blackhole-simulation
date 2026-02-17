/**
 * Error Tracking Utility
 *
 * Provides centralized error capturing and logging for the application.
 * Stores a history of errors for forensic analysis in the ErrorBoundary.
 */

export interface TrackedErrorEvent {
  timestamp: number;
  type: string;
  message: string;
  context?: Record<string, unknown>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorLog: TrackedErrorEvent[] = [];
  private readonly MAX_LOG_SIZE = 50;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener(
        "unhandledrejection",
        this.handlePromiseRejection,
      );
      window.addEventListener("error", this.handleGlobalError);
    }
  }

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    this.captureException(event.reason, { type: "UNHANDLED_PROMISE" });
  };

  private handleGlobalError = (event: globalThis.ErrorEvent) => {
    this.captureException(event.error, { type: "UNCAUGHT_EXCEPTION" });
  };

  public captureException(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any,
    context: Record<string, unknown> = {},
  ) {
    // eslint-disable-next-line no-console
    console.error("[ErrorTracker] Captured:", error);

    const errorEvent: TrackedErrorEvent = {
      timestamp: Date.now(),
      type:
        (context.errorCategory as string) ||
        (context.type as string) ||
        "ERROR",
      message: error?.message || String(error),
      context: {
        ...context,
        stack: error?.stack,
      },
    };

    this.errorLog.unshift(errorEvent);

    if (this.errorLog.length > this.MAX_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(0, this.MAX_LOG_SIZE);
    }
  }

  public getErrors(): TrackedErrorEvent[] {
    return this.errorLog;
  }

  public clearErrors() {
    this.errorLog = [];
  }
}

const errorTracker = ErrorTracker.getInstance();
export default errorTracker;
