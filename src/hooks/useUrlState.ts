import { useEffect, useCallback } from "react";
import type { SimulationParams } from "@/types/simulation";
import { DEFAULT_PARAMS } from "@/types/simulation";

/**
 * URL hash-based state persistence for shareable simulation configurations.
 *
 * Encodes simulation parameters into the URL hash:
 *   #mass=0.5&spin=0.9&zoom=50&preset=ultra-quality
 *
 * On mount, reads the hash and applies any parameters found.
 * On param change, updates the hash (debounced to avoid browser history spam).
 *
 * Phase 7: URL state persistence for shareable links.
 */

// Parameters to persist in URL (subset of SimulationParams)
const URL_KEYS = [
  "mass",
  "spin",
  "zoom",
  "lensing",
  "diskTemp",
  "diskDensity",
  "diskSize",
  "autoSpin",
] as const;

type UrlKey = (typeof URL_KEYS)[number];

/**
 * Parse the current URL hash into partial simulation params.
 */
function parseHash(): Partial<SimulationParams> {
  if (typeof window === "undefined") return {};

  const hash = window.location.hash.slice(1); // Remove '#'
  if (!hash) return {};

  const parsed: Partial<SimulationParams> = {};
  const pairs = hash.split("&");

  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (!key || !value) continue;

    if ((URL_KEYS as readonly string[]).includes(key)) {
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        (parsed as Record<string, number>)[key] = num;
      }
    }

    if (key === "paused") {
      parsed.paused = value === "true";
    }

    if (key === "preset") {
      parsed.performancePreset = value as SimulationParams["performancePreset"];
    }
  }

  return parsed;
}

/**
 * Encode simulation params into a URL hash string.
 */
function encodeHash(params: SimulationParams): string {
  const parts: string[] = [];

  for (const key of URL_KEYS) {
    const val = params[key as UrlKey];
    const def = DEFAULT_PARAMS[key as UrlKey];
    // Only encode non-default values to keep URLs short
    if (val !== def) {
      parts.push(`${key}=${val}`);
    }
  }

  if (
    params.performancePreset &&
    params.performancePreset !== "ultra-quality"
  ) {
    parts.push(`preset=${params.performancePreset}`);
  }

  return parts.length > 0 ? `#${parts.join("&")}` : "";
}

export function useUrlState(
  params: SimulationParams,
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>,
) {
  // On mount: read hash and apply to params
  useEffect(() => {
    const hashParams = parseHash();
    if (Object.keys(hashParams).length > 0) {
      setParams((prev) => ({ ...prev, ...hashParams }));
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced hash update (500ms to avoid history spam during slider drags)
  useEffect(() => {
    const timer = setTimeout(() => {
      const hash = encodeHash(params);
      if (hash) {
        // Use replaceState to avoid polluting browser history
        window.history.replaceState(null, "", hash);
      } else {
        // Clear hash without leaving '#'
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [params]);

  const getShareableUrl = useCallback(() => {
    const hash = encodeHash(params);
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }, [params]);

  return { getShareableUrl };
}
