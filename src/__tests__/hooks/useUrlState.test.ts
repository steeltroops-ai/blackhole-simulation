/**
 * Tests for URL state persistence hook.
 *
 * Phase 7: Shareable simulation links via URL hash.
 */
import { describe, it, expect, beforeEach } from "vitest";

// We test the pure functions directly rather than the hook (which needs React)
// Extract parseHash and encodeHash logic for unit testing

describe("URL State Persistence", () => {
  beforeEach(() => {
    // Reset URL hash
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  describe("hash parsing", () => {
    it("should return empty object for no hash", () => {
      // Simulate no hash
      const result = parseHashString("");
      expect(result).toEqual({});
    });

    it("should parse numeric parameters", () => {
      const result = parseHashString("mass=1.5&zoom=30");
      expect(result.mass).toBe(1.5);
      expect(result.zoom).toBe(30);
    });

    it("should parse preset parameter", () => {
      const result = parseHashString("preset=balanced");
      expect(result.preset).toBe("balanced");
    });

    it("should ignore invalid numeric values", () => {
      const result = parseHashString("mass=abc&zoom=30");
      expect(result.mass).toBeUndefined();
      expect(result.zoom).toBe(30);
    });

    it("should handle Infinity and NaN", () => {
      const result = parseHashString("mass=Infinity&zoom=NaN");
      expect(result.mass).toBeUndefined();
      expect(result.zoom).toBeUndefined();
    });

    it("should ignore unknown keys", () => {
      const result = parseHashString("foo=bar&mass=1.0");
      expect(result.foo).toBeUndefined();
      expect(result.mass).toBe(1.0);
    });
  });

  describe("hash encoding", () => {
    it("should only encode non-default values", () => {
      const result = encodeHashString({
        mass: 0.5, // default
        zoom: 30, // non-default
      });
      expect(result).not.toContain("mass=");
      expect(result).toContain("zoom=30");
    });

    it("should return empty string when all values are default", () => {
      const result = encodeHashString({});
      expect(result).toBe("");
    });
  });
});

// Pure helper implementations for testing (mirrors useUrlState.ts logic)
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

const DEFAULTS: Record<string, number> = {
  mass: 0.5,
  spin: 0.9,
  zoom: 50.0,
  lensing: 1.0,
  diskTemp: 4500,
  diskDensity: 0.8,
  diskSize: 30.0,
  autoSpin: 0.3,
};

function parseHashString(
  hash: string,
): Record<string, string | number | undefined> {
  const result: Record<string, string | number | undefined> = {};
  if (!hash) return result;

  const pairs = hash.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (!key || !value) continue;

    if ((URL_KEYS as readonly string[]).includes(key)) {
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        result[key] = num;
      }
    } else if (key === "preset") {
      result.preset = value;
    }
  }

  return result;
}

function encodeHashString(
  overrides: Record<string, number | undefined>,
): string {
  const parts: string[] = [];

  for (const key of URL_KEYS) {
    const val = overrides[key] ?? DEFAULTS[key];
    const def = DEFAULTS[key];
    if (val !== undefined && val !== def) {
      parts.push(`${key}=${val}`);
    }
  }

  return parts.length > 0 ? `#${parts.join("&")}` : "";
}
