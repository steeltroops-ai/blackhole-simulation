"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/debug/ErrorDisplay";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Segment Level Failure:", error);
  }, [error]);

  return (
    <ErrorDisplay 
      error={error} 
      reset={reset} 
    />
  );
}
