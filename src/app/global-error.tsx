"use client";

import { useEffect } from "react";
import { ErrorDisplay } from "@/components/debug/ErrorDisplay";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global System Failure:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black overflow-hidden m-0 p-0">
        <ErrorDisplay 
          error={error} 
          reset={reset} 
        />
      </body>
    </html>
  );
}
