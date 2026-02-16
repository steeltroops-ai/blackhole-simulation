/**
 * Property-based tests for CPU optimization utilities
 *
 * Tests physics caching, debouncing, and idle detection
 */

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import {
  PhysicsCache,
  debounce,
  IdleDetector,
  UniformBatcher,
} from "@/utils/cpu-optimizations";

describe("CPU Optimizations", () => {
  vi.setConfig({ testTimeout: 10000 });

  describe("PhysicsCache", () => {
    /**
     * Feature: performance-optimization, Property 15: Physics value caching
     * Validates: Requirements 14.2
     *
     * For any physics calculation whose inputs haven't changed between frames,
     * the cached result should be returned instead of recalculating.
     */
    it("should return cached values for unchanged inputs", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              mass: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
              spin: fc.float({ min: Math.fround(-1), max: Math.fround(1) }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (inputs) => {
            const cache = new PhysicsCache<(typeof inputs)[0], number>();
            const computeFn = vi.fn((input: (typeof inputs)[0]) => {
              // Simulate expensive calculation
              return input.mass * input.spin;
            });

            // First pass: compute all values
            const firstResults = inputs.map((input) =>
              cache.get(input, computeFn),
            );

            // Second pass: should use cache for all values
            const secondResults = inputs.map((input) =>
              cache.get(input, computeFn),
            );

            // Results should be identical
            expect(firstResults).toEqual(secondResults);

            // Compute function should only be called once per unique input
            const uniqueInputs = new Set(inputs.map((i) => JSON.stringify(i)));
            expect(computeFn).toHaveBeenCalledTimes(uniqueInputs.size);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should recompute when inputs change", () => {
      fc.assert(
        fc.property(
          fc.record({
            mass: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            spin: fc.float({ min: Math.fround(-1), max: Math.fround(1) }),
          }),
          fc.record({
            mass: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
            spin: fc.float({ min: Math.fround(-1), max: Math.fround(1) }),
          }),
          (input1, input2) => {
            // Ensure inputs are different
            fc.pre(JSON.stringify(input1) !== JSON.stringify(input2));

            const cache = new PhysicsCache<typeof input1, number>();
            const computeFn = vi.fn((input: typeof input1) => {
              return input.mass * input.spin;
            });

            // Compute with first input
            const result1 = cache.get(input1, computeFn);

            // Compute with second input
            const result2 = cache.get(input2, computeFn);

            // Should have called compute function twice
            expect(computeFn).toHaveBeenCalledTimes(2);

            // Results should be different (unless they happen to be equal)
            const expected1 = input1.mass * input1.spin;
            const expected2 = input2.mass * input2.spin;
            expect(result1).toBe(expected1);
            expect(result2).toBe(expected2);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should support custom key functions", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              mass: fc.float({ min: Math.fround(0.1), max: Math.fround(100) }),
              spin: fc.float({ min: Math.fround(-1), max: Math.fround(1) }),
              timestamp: fc.integer({ min: 0, max: 1000000 }),
            }),
            { minLength: 2, maxLength: 10 },
          ),
          (inputs) => {
            const cache = new PhysicsCache<(typeof inputs)[0], number>();
            const computeFn = vi.fn((input: (typeof inputs)[0]) => {
              return input.mass * input.spin;
            });

            // Use custom key that ignores timestamp
            const keyFn = (input: (typeof inputs)[0]) =>
              `${input.mass}-${input.spin}`;

            // Compute all values
            inputs.forEach((input) => cache.get(input, computeFn, keyFn));

            // Count unique keys
            const uniqueKeys = new Set(inputs.map(keyFn));

            // Should only compute once per unique key
            expect(computeFn).toHaveBeenCalledTimes(uniqueKeys.size);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe("debounce", () => {
    /**
     * Feature: performance-optimization, Property 16: Parameter debouncing
     * Validates: Requirements 14.3
     *
     * For any rapid sequence of parameter changes within a short time window (< 100ms),
     * only the final value should trigger recalculation.
     */
    it("should only call function once after rapid changes", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 100 }), {
            minLength: 2,
            maxLength: 20,
          }),
          fc.integer({ min: 10, max: 50 }),
          async (values, waitTime) => {
            const mockFn = vi.fn();
            const debouncedFn = debounce(mockFn, waitTime);

            // Call function rapidly with different values
            values.forEach((value) => {
              debouncedFn(value);
            });

            // Should not have been called yet
            expect(mockFn).not.toHaveBeenCalled();

            // Wait for debounce to complete (generous buffer)
            await new Promise((resolve) => setTimeout(resolve, waitTime + 50));

            // Should have been called exactly once with the last value
            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(mockFn).toHaveBeenCalledWith(values[values.length - 1]);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it("should reset timer on each call", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 30, max: 60 }),
          fc.integer({ min: 2, max: 3 }),
          async (waitTime, numCalls) => {
            const mockFn = vi.fn();
            const debouncedFn = debounce(mockFn, waitTime);

            // Make calls at intervals less than waitTime
            const interval = Math.floor(waitTime * 0.3);
            for (let i = 0; i < numCalls; i++) {
              debouncedFn(i);
              if (i < numCalls - 1) {
                await new Promise((resolve) => setTimeout(resolve, interval));
              }
            }

            // Should not have been called yet because timer keeps resetting
            expect(mockFn).not.toHaveBeenCalled();

            // Wait past the wait time from the last call (generous buffer)
            await new Promise((resolve) => setTimeout(resolve, waitTime + 50));

            // Should have been called exactly once with the last value
            expect(mockFn).toHaveBeenCalledTimes(1);
            expect(mockFn).toHaveBeenCalledWith(numCalls - 1);

            return true;
          },
        ),
        { numRuns: 5 },
      );
    });
  });

  describe("IdleDetector", () => {
    /**
     * Feature: performance-optimization, Property 17: Idle frame rate reduction
     * Validates: Requirements 14.5
     *
     * For any idle state (no user input for > 5 seconds),
     * the animation loop should reduce to 30 FPS.
     */
    it("should detect idle state after threshold", async () => {
      const thresholdMs = 500;
      const detector = new IdleDetector(thresholdMs);

      // Initially not idle
      expect(detector.isIdle()).toBe(false);

      // Wait less than threshold
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(detector.isIdle()).toBe(false);

      // Wait past threshold (total > 500)
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(detector.isIdle()).toBe(true);
    });

    it("should reset idle state on activity", async () => {
      const thresholdMs = 500;
      const detector = new IdleDetector(thresholdMs);

      // Record activity
      detector.recordActivity();

      // Should not be idle immediately after activity
      expect(detector.isIdle()).toBe(false);

      // Wait less than threshold
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Record activity again
      detector.recordActivity();

      // Should still not be idle
      expect(detector.isIdle()).toBe(false);

      // Wait past threshold from last activity
      await new Promise((resolve) => setTimeout(resolve, 550));
      expect(detector.isIdle()).toBe(true);
    });

    it("should track time since last activity", async () => {
      const thresholdMs = 100;
      const elapsedTime = 50;
      const detector = new IdleDetector(thresholdMs);

      // Record activity
      detector.recordActivity();

      // Wait
      await new Promise((resolve) => setTimeout(resolve, elapsedTime));

      // Time since activity should match elapsed time (with tolerance for timer precision)
      const timeSinceActivity = detector.getTimeSinceActivity();
      expect(timeSinceActivity).toBeGreaterThanOrEqual(elapsedTime - 50);
      expect(timeSinceActivity).toBeLessThan(elapsedTime + 500);
    });
  });

  describe("UniformBatcher", () => {
    it("should only update GL when value changes (dirty checking)", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              name: fc.constantFrom("u_mass", "u_spin", "u_zoom", "u_time"),
              value: fc.float({ min: 0, max: 100 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          (updates) => {
            const batcher = new UniformBatcher();

            // Mock WebGL context
            const mockGl = {
              createProgram: vi.fn(),
              getProgramParameter: vi.fn((_, pname) => {
                if (pname === 0x8b89) return 4; // ACTIVE_UNIFORMS
                if (pname === 0x8b81) return 0; // ACTIVE_ATTRIBUTES
                return 0;
              }),
              getActiveUniform: vi.fn((_, i) => ({
                name: ["u_mass", "u_spin", "u_zoom", "u_time"][i],
                type: 0,
              })),
              getActiveAttrib: vi.fn(),
              getUniformLocation: vi.fn((_, name) => ({ name })),
              getAttribLocation: vi.fn(() => -1),
              uniform1f: vi.fn(),
              uniform1i: vi.fn(),
              uniform2f: vi.fn(),
              uniform3f: vi.fn(),
              uniform4f: vi.fn(),
              ACTIVE_UNIFORMS: 0x8b89,
              ACTIVE_ATTRIBUTES: 0x8b81,
            } as unknown as WebGL2RenderingContext;

            const mockProgram = {} as WebGLProgram;

            // Initialize batcher
            batcher.upload(mockGl, mockProgram);

            // Apply updates
            updates.forEach(({ name, value }) => {
              batcher.set(name, value);
            });

            // Calculate expected updates (filtering out duplicates)
            const expectedUpdates = new Map<string, number>();
            let expectedCallCount = 0;

            updates.forEach(({ name, value }) => {
              const prev = expectedUpdates.get(name);
              if (prev !== value) {
                expectedUpdates.set(name, value);
                expectedCallCount++;
              }
            });

            expect(mockGl.uniform1f).toHaveBeenCalledTimes(expectedCallCount);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
