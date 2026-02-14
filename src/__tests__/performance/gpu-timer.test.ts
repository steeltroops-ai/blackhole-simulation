/**
 * Tests for GPU Timer module.
 *
 * Phase 7: GPU timing via EXT_disjoint_timer_query_webgl2.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GPUTimer } from "@/performance/gpu-timer";

describe("GPUTimer", () => {
  let timer: GPUTimer;

  beforeEach(() => {
    timer = new GPUTimer();
  });

  describe("initialization", () => {
    it("should report unavailable before initialization", () => {
      expect(timer.available).toBe(false);
      expect(timer.getLastGpuTimeMs()).toBe(0);
    });

    it("should handle missing extension gracefully", () => {
      const mockGl = {
        getExtension: () => null,
      } as unknown as WebGL2RenderingContext;

      const result = timer.initialize(mockGl);
      expect(result).toBe(false);
      expect(timer.available).toBe(false);
    });

    it("should succeed when extension is available", () => {
      const mockExt = {
        TIME_ELAPSED_EXT: 0x88bf,
        GPU_DISJOINT_EXT: 0x8fbb,
      };

      const mockGl = {
        getExtension: (name: string) => {
          if (name === "EXT_disjoint_timer_query_webgl2") return mockExt;
          return null;
        },
      } as unknown as WebGL2RenderingContext;

      const result = timer.initialize(mockGl);
      expect(result).toBe(true);
      expect(timer.available).toBe(true);
    });
  });

  describe("frame timing", () => {
    it("should be a no-op when extension is unavailable", () => {
      // Should not throw or crash
      timer.beginFrame();
      timer.endFrame();
      expect(timer.getLastGpuTimeMs()).toBe(0);
    });

    it("should collect results when query completes", () => {
      const mockQuery = { id: 1 };
      const MOCK_GPU_TIME_NS = 5_000_000; // 5ms in nanoseconds

      const mockExt = {
        TIME_ELAPSED_EXT: 0x88bf,
        GPU_DISJOINT_EXT: 0x8fbb,
      };

      // Mock WebGL2 core methods
      const mockGl = {
        getExtension: () => mockExt,
        getParameter: () => false, // GPU_DISJOINT_EXT check
        createQuery: vi.fn().mockReturnValue(mockQuery),
        beginQuery: vi.fn(),
        endQuery: vi.fn(),
        getQueryParameter: vi.fn((query, pname) => {
          // QUERY_RESULT_AVAILABLE
          if (pname === 0x8867) return true;
          // QUERY_RESULT
          if (pname === 0x8866) return MOCK_GPU_TIME_NS;
          return 0;
        }),
        deleteQuery: vi.fn(),
        QUERY_RESULT_AVAILABLE: 0x8867,
        QUERY_RESULT: 0x8866,
      } as unknown as WebGL2RenderingContext;

      timer.initialize(mockGl);
      timer.beginFrame();
      expect(mockGl.beginQuery).toHaveBeenCalledWith(
        mockExt.TIME_ELAPSED_EXT,
        mockQuery,
      );

      timer.endFrame();
      expect(mockGl.endQuery).toHaveBeenCalledWith(mockExt.TIME_ELAPSED_EXT);
      expect(mockGl.getQueryParameter).toHaveBeenCalledTimes(2); // Available check + Result get
      expect(mockGl.deleteQuery).toHaveBeenCalledWith(mockQuery);

      expect(timer.getLastGpuTimeMs()).toBeCloseTo(5.0, 1);
    });
  });

  describe("disjoint handling", () => {
    it("should drain pending queries on disjoint", () => {
      const mockExt = {
        TIME_ELAPSED_EXT: 0x88bf,
        GPU_DISJOINT_EXT: 0x8fbb,
      };

      let isDisjoint = false;

      const mockGl = {
        getExtension: () => mockExt,
        getParameter: (pname: number) => {
          return pname === mockExt.GPU_DISJOINT_EXT ? isDisjoint : false;
        },
        createQuery: vi.fn().mockReturnValue({}),
        beginQuery: vi.fn(),
        endQuery: vi.fn(),
        getQueryParameter: vi.fn(),
        deleteQuery: vi.fn(),
        QUERY_RESULT_AVAILABLE: 0x8867,
        QUERY_RESULT: 0x8866,
      } as unknown as WebGL2RenderingContext;

      timer.initialize(mockGl);

      // 1. Start normal frames
      timer.beginFrame();
      timer.endFrame();
      timer.beginFrame();
      timer.endFrame();

      // Simulate disjoint event
      isDisjoint = true;

      // 2. Next frame starts -> Checks disjoint -> Drains pending
      timer.beginFrame();

      // Expect deleteQuery to have been called for previous queries
      // We started 2 frames so 2 queries pending.
      // Draining calls deleteQuery on them.
      expect(mockGl.deleteQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanup", () => {
    it("should reset all state on cleanup", () => {
      const mockExt = {
        TIME_ELAPSED_EXT: 0x88bf,
        GPU_DISJOINT_EXT: 0x8fbb,
      };

      const mockGl = {
        getExtension: () => mockExt,
        getParameter: () => false,
        createQuery: () => ({}),
        beginQuery: () => {},
        endQuery: () => {},
        deleteQuery: () => {},
      } as unknown as WebGL2RenderingContext;

      timer.initialize(mockGl);
      expect(timer.available).toBe(true);

      timer.cleanup();
      expect(timer.available).toBe(false);
      expect(timer.getLastGpuTimeMs()).toBe(0);
    });
  });
});
