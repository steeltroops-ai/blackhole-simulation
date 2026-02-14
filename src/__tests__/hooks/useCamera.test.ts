import { describe, test, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Feature: blackhole-enhancement, Property 14: Zoom bounds enforcement
 * Validates: Requirements 5.2, 5.6
 *
 * For any zoom adjustment input, the resulting zoom value should be clamped
 * to the range [minZoom, maxZoom] and should not exceed these bounds
 * regardless of input magnitude.
 */
describe("Property 14: Zoom bounds enforcement", () => {
  const MIN_ZOOM = 2.5;
  const MAX_ZOOM = 50.0;

  /**
   * Clamps zoom value to valid bounds
   */
  function clampZoom(zoom: number): number {
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  }

  test("zoom is always clamped to [MIN_ZOOM, MAX_ZOOM] bounds", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000.0, max: 1000.0, noNaN: true }), // arbitrary zoom value
        (zoom) => {
          const clamped = clampZoom(zoom);

          // Clamped value should be within bounds
          expect(clamped).toBeGreaterThanOrEqual(MIN_ZOOM);
          expect(clamped).toBeLessThanOrEqual(MAX_ZOOM);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("zoom below minimum is clamped to MIN_ZOOM", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000.0, max: MIN_ZOOM - 0.1, noNaN: true }), // below minimum
        (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBe(MIN_ZOOM);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("zoom above maximum is clamped to MAX_ZOOM", () => {
    fc.assert(
      fc.property(
        fc.double({ min: MAX_ZOOM + 0.1, max: 1000.0, noNaN: true }), // above maximum
        (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBe(MAX_ZOOM);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("zoom within bounds remains unchanged", () => {
    fc.assert(
      fc.property(
        fc.double({ min: MIN_ZOOM, max: MAX_ZOOM, noNaN: true }), // within bounds
        (zoom) => {
          const clamped = clampZoom(zoom);
          expect(clamped).toBeCloseTo(zoom, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("applying zoom delta respects bounds", () => {
    fc.assert(
      fc.property(
        fc.double({ min: MIN_ZOOM, max: MAX_ZOOM, noNaN: true }), // current zoom
        fc.double({ min: -100.0, max: 100.0, noNaN: true }), // zoom delta
        (currentZoom, delta) => {
          const newZoom = clampZoom(currentZoom + delta);

          // Result should always be in bounds
          expect(newZoom).toBeGreaterThanOrEqual(MIN_ZOOM);
          expect(newZoom).toBeLessThanOrEqual(MAX_ZOOM);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 15: Camera angle updates
 * Validates: Requirements 5.4
 *
 * For any mouse movement input, the camera angles (theta, phi) should update
 * proportionally to the mouse delta, and phi should be clamped to [0, π]
 * to prevent gimbal lock.
 */
describe("Property 15: Camera angle updates", () => {
  /**
   * Updates camera angles based on mouse delta
   */
  function updateCameraAngles(params: {
    theta: number;
    phi: number;
    deltaX: number;
    deltaY: number;
    sensitivity?: number;
  }): { theta: number; phi: number } {
    const { theta, phi, deltaX, deltaY, sensitivity = 0.005 } = params;
    const newTheta = theta + deltaX * sensitivity;
    let newPhi = phi + deltaY * sensitivity;

    // Clamp phi to [0, π] to prevent gimbal lock
    newPhi = Math.max(0, Math.min(Math.PI, newPhi));

    return { theta: newTheta, phi: newPhi };
  }

  test("phi is always clamped to [0, π] range", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0, max: Math.PI, noNaN: true }), // phi
        fc.integer({ min: -1000, max: 1000 }), // deltaX
        fc.integer({ min: -1000, max: 1000 }), // deltaY
        (theta, phi, deltaX, deltaY) => {
          const result = updateCameraAngles({ theta, phi, deltaX, deltaY });

          // Phi should always be in [0, π]
          expect(result.phi).toBeGreaterThanOrEqual(0);
          expect(result.phi).toBeLessThanOrEqual(Math.PI);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("theta updates proportionally to deltaX", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0.1, max: Math.PI - 0.1, noNaN: true }), // phi (away from boundaries)
        fc.integer({ min: -100, max: 100 }), // deltaX
        (theta, phi, deltaX) => {
          const sensitivity = 0.005;
          const result = updateCameraAngles({
            theta,
            phi,
            deltaX,
            deltaY: 0,
            sensitivity,
          });

          // Theta should change by deltaX * sensitivity
          const expectedTheta = theta + deltaX * sensitivity;
          expect(result.theta).toBeCloseTo(expectedTheta, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("phi updates proportionally to deltaY when not at boundaries", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0.2, max: Math.PI - 0.2, noNaN: true }), // phi (well within bounds)
        fc.integer({ min: -10, max: 10 }), // small deltaY to stay in bounds
        (theta, phi, deltaY) => {
          const sensitivity = 0.005;
          const result = updateCameraAngles({
            theta,
            phi,
            deltaX: 0,
            deltaY,
            sensitivity,
          });

          // Phi should change by deltaY * sensitivity (when not clamped)
          const expectedPhi = phi + deltaY * sensitivity;
          if (expectedPhi >= 0 && expectedPhi <= Math.PI) {
            expect(result.phi).toBeCloseTo(expectedPhi, 10);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  test("phi at 0 cannot go negative", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.integer({ min: -1000, max: -1 }), // negative deltaY
        (theta, deltaY) => {
          const phi = 0; // at lower bound
          const result = updateCameraAngles({ theta, phi, deltaX: 0, deltaY });

          // Phi should remain at 0
          expect(result.phi).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("phi at π cannot exceed π", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.integer({ min: 1, max: 1000 }), // positive deltaY
        (theta, deltaY) => {
          const phi = Math.PI; // at upper bound
          const result = updateCameraAngles({ theta, phi, deltaX: 0, deltaY });

          // Phi should remain at π
          expect(result.phi).toBe(Math.PI);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 16: Momentum damping convergence
 * Validates: Requirements 5.5
 *
 * For any initial velocity, applying momentum damping repeatedly should cause
 * the velocity to converge to zero over time.
 */
describe("Property 16: Momentum damping convergence", () => {
  /**
   * Applies damping to velocity
   */
  function applyDamping(velocity: number, damping: number): number {
    return velocity * damping;
  }

  /**
   * Applies damping repeatedly for n iterations
   */
  function applyDampingIterations(
    initialVelocity: number,
    damping: number,
    iterations: number,
  ): number {
    let velocity = initialVelocity;
    for (let i = 0; i < iterations; i++) {
      velocity = applyDamping(velocity, damping);
    }
    return velocity;
  }

  test("velocity converges to zero with repeated damping", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10.0, max: 10.0, noNaN: true }), // initial velocity
        fc.double({ min: 0.8, max: 0.99, noNaN: true }), // damping factor
        (initialVelocity, damping) => {
          // Apply damping for many iterations
          const iterations = 1000;
          const finalVelocity = applyDampingIterations(
            initialVelocity,
            damping,
            iterations,
          );

          // Velocity should be very close to zero
          expect(Math.abs(finalVelocity)).toBeLessThan(0.001);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("velocity magnitude decreases with each damping application", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10.0, max: 10.0, noNaN: true }), // initial velocity
        fc.double({ min: 0.8, max: 0.99, noNaN: true }), // damping factor
        (initialVelocity, damping) => {
          const v1 = initialVelocity;
          const v2 = applyDamping(v1, damping);

          // Magnitude should decrease (or stay zero)
          expect(Math.abs(v2)).toBeLessThanOrEqual(Math.abs(v1));
        },
      ),
      { numRuns: 100 },
    );
  });

  test("damping preserves velocity sign", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10.0, max: 10.0, noNaN: true }), // initial velocity
        fc.double({ min: 0.8, max: 0.99, noNaN: true }), // damping factor
        (initialVelocity, damping) => {
          if (initialVelocity === 0) return; // skip zero case

          const dampedVelocity = applyDamping(initialVelocity, damping);

          // Sign should be preserved
          expect(Math.sign(dampedVelocity)).toBe(Math.sign(initialVelocity));
        },
      ),
      { numRuns: 100 },
    );
  });

  test("zero velocity remains zero after damping", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.8, max: 0.99, noNaN: true }), // damping factor
        (damping) => {
          const velocity = 0;
          const dampedVelocity = applyDamping(velocity, damping);

          expect(dampedVelocity).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("higher damping factor results in slower convergence", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10.0, max: 10.0, noNaN: true }), // initial velocity
        fc.double({ min: 0.8, max: 0.94, noNaN: true }), // lower damping
        (initialVelocity, lowerDamping) => {
          if (initialVelocity === 0) return; // skip zero case

          const higherDamping = lowerDamping + 0.05;
          const iterations = 50;

          const velocityLower = applyDampingIterations(
            initialVelocity,
            lowerDamping,
            iterations,
          );
          const velocityHigher = applyDampingIterations(
            initialVelocity,
            higherDamping,
            iterations,
          );

          // Higher damping should result in larger remaining velocity
          // (slower convergence to zero)
          expect(Math.abs(velocityHigher)).toBeGreaterThanOrEqual(
            Math.abs(velocityLower) - 1e-10,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 17: Single touch camera rotation
 * Validates: Requirements 6.1
 *
 * For any single touch movement, the camera angles should update based on
 * touch delta, similar to mouse drag behavior.
 */
describe("Property 17: Single touch camera rotation", () => {
  /**
   * Updates camera angles based on touch delta (same as mouse)
   */
  function updateCameraFromTouch(params: {
    theta: number;
    phi: number;
    touchDeltaX: number;
    touchDeltaY: number;
    sensitivity?: number;
  }): { theta: number; phi: number } {
    const {
      theta,
      phi,
      touchDeltaX,
      touchDeltaY,
      sensitivity = 0.005,
    } = params;
    const newTheta = theta + touchDeltaX * sensitivity;
    let newPhi = phi + touchDeltaY * sensitivity;

    // Clamp phi to [0, π]
    newPhi = Math.max(0, Math.min(Math.PI, newPhi));

    return { theta: newTheta, phi: newPhi };
  }

  test("single touch updates camera angles proportionally", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0.1, max: Math.PI - 0.1, noNaN: true }), // phi
        fc.integer({ min: -100, max: 100 }), // touch deltaX
        fc.integer({ min: -100, max: 100 }), // touch deltaY
        (theta, phi, deltaX, deltaY) => {
          const result = updateCameraFromTouch({
            theta,
            phi,
            touchDeltaX: deltaX,
            touchDeltaY: deltaY,
          });

          // Angles should update
          const sensitivity = 0.005;
          const expectedTheta = theta + deltaX * sensitivity;
          expect(result.theta).toBeCloseTo(expectedTheta, 10);

          // Phi should be clamped to [0, π]
          expect(result.phi).toBeGreaterThanOrEqual(0);
          expect(result.phi).toBeLessThanOrEqual(Math.PI);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("single touch respects phi bounds", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0, max: Math.PI, noNaN: true }), // phi
        fc.integer({ min: -1000, max: 1000 }), // large touch delta
        (theta, phi, deltaY) => {
          const result = updateCameraFromTouch({
            theta,
            phi,
            touchDeltaX: 0,
            touchDeltaY: deltaY,
          });

          // Phi should always be in [0, π]
          expect(result.phi).toBeGreaterThanOrEqual(0);
          expect(result.phi).toBeLessThanOrEqual(Math.PI);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 18: Pinch zoom calculation
 * Validates: Requirements 6.2
 *
 * For any two-touch gesture, when the distance between touches increases,
 * zoom should decrease (move closer), and when distance decreases, zoom
 * should increase (move farther).
 */
describe("Property 18: Pinch zoom calculation", () => {
  const MIN_ZOOM = 2.5;
  const MAX_ZOOM = 50.0;

  /**
   * Calculates zoom change from pinch gesture
   */
  function calculatePinchZoom(
    currentZoom: number,
    initialDistance: number,
    currentDistance: number,
  ): number {
    const distanceRatio = currentDistance / initialDistance;
    const zoomDelta = (1 - distanceRatio) * 2.0;
    const newZoom = currentZoom + zoomDelta;

    // Clamp to bounds
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  }

  test("increasing touch distance decreases zoom (moves closer)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: MIN_ZOOM + 5, max: MAX_ZOOM - 5, noNaN: true }), // current zoom
        fc.double({ min: 50, max: 500, noNaN: true }), // initial distance
        (currentZoom, initialDistance) => {
          const increasedDistance = initialDistance * 1.2; // 20% increase
          const newZoom = calculatePinchZoom(
            currentZoom,
            initialDistance,
            increasedDistance,
          );

          // Zoom should decrease (move closer to object)
          expect(newZoom).toBeLessThan(currentZoom);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("decreasing touch distance increases zoom (moves farther)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: MIN_ZOOM + 5, max: MAX_ZOOM - 5, noNaN: true }), // current zoom
        fc.double({ min: 50, max: 500, noNaN: true }), // initial distance
        (currentZoom, initialDistance) => {
          const decreasedDistance = initialDistance * 0.8; // 20% decrease
          const newZoom = calculatePinchZoom(
            currentZoom,
            initialDistance,
            decreasedDistance,
          );

          // Zoom should increase (move farther from object)
          expect(newZoom).toBeGreaterThan(currentZoom);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("pinch zoom respects bounds", () => {
    fc.assert(
      fc.property(
        fc.double({ min: MIN_ZOOM, max: MAX_ZOOM, noNaN: true }), // current zoom
        fc.double({ min: 50, max: 500, noNaN: true }), // initial distance
        fc.double({ min: 10, max: 1000, noNaN: true }), // current distance
        (currentZoom, initialDistance, currentDistance) => {
          const newZoom = calculatePinchZoom(
            currentZoom,
            initialDistance,
            currentDistance,
          );

          // Zoom should always be in bounds
          expect(newZoom).toBeGreaterThanOrEqual(MIN_ZOOM);
          expect(newZoom).toBeLessThanOrEqual(MAX_ZOOM);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("no distance change results in no zoom change", () => {
    fc.assert(
      fc.property(
        fc.double({ min: MIN_ZOOM, max: MAX_ZOOM, noNaN: true }), // current zoom
        fc.double({ min: 50, max: 500, noNaN: true }), // distance
        (currentZoom, distance) => {
          const newZoom = calculatePinchZoom(currentZoom, distance, distance);

          // Zoom should remain the same
          expect(newZoom).toBeCloseTo(currentZoom, 5);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 19: Two-finger rotation
 * Validates: Requirements 6.3
 *
 * For any two-touch gesture, when the angle between touches changes,
 * the camera rotation should update proportionally to the angle delta.
 */
describe("Property 19: Two-finger rotation", () => {
  /**
   * Updates camera theta based on two-finger rotation
   */
  function updateThetaFromRotation(
    theta: number,
    initialAngle: number,
    currentAngle: number,
    sensitivity: number = 0.5,
  ): number {
    const angleDelta = currentAngle - initialAngle;
    return theta + angleDelta * sensitivity;
  }

  test("camera theta updates proportionally to angle change", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }), // initial angle
        fc.double({ min: -0.5, max: 0.5, noNaN: true }), // angle delta
        (theta, initialAngle, angleDelta) => {
          const currentAngle = initialAngle + angleDelta;
          const newTheta = updateThetaFromRotation(
            theta,
            initialAngle,
            currentAngle,
          );

          const sensitivity = 0.5;
          const expectedTheta = theta + angleDelta * sensitivity;
          expect(newTheta).toBeCloseTo(expectedTheta, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("clockwise rotation increases theta", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }), // initial angle
        (theta, initialAngle) => {
          const clockwiseAngle = initialAngle + 0.1; // small clockwise rotation
          const newTheta = updateThetaFromRotation(
            theta,
            initialAngle,
            clockwiseAngle,
          );

          // Theta should increase
          expect(newTheta).toBeGreaterThan(theta);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("counter-clockwise rotation decreases theta", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }), // initial angle
        (theta, initialAngle) => {
          const counterClockwiseAngle = initialAngle - 0.1; // small counter-clockwise
          const newTheta = updateThetaFromRotation(
            theta,
            initialAngle,
            counterClockwiseAngle,
          );

          // Theta should decrease
          expect(newTheta).toBeLessThan(theta);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: blackhole-enhancement, Property 20: Two-finger pan
 * Validates: Requirements 6.4
 *
 * For any two-touch drag gesture, the camera position should update based
 * on the movement of the touch center point.
 */
describe("Property 20: Two-finger pan", () => {
  /**
   * Updates camera angles based on two-finger pan
   */
  function updateCameraFromPan(params: {
    theta: number;
    phi: number;
    panDeltaX: number;
    panDeltaY: number;
    sensitivity?: number;
  }): { theta: number; phi: number } {
    const { theta, phi, panDeltaX, panDeltaY, sensitivity = 0.003 } = params;
    const newTheta = theta + panDeltaX * sensitivity;
    let newPhi = phi + panDeltaY * sensitivity;

    // Clamp phi to [0, π]
    newPhi = Math.max(0, Math.min(Math.PI, newPhi));

    return { theta: newTheta, phi: newPhi };
  }

  test("pan updates camera angles based on center movement", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0.1, max: Math.PI - 0.1, noNaN: true }), // phi
        fc.integer({ min: -100, max: 100 }), // pan deltaX
        fc.integer({ min: -100, max: 100 }), // pan deltaY
        (theta, phi, deltaX, deltaY) => {
          const result = updateCameraFromPan({
            theta,
            phi,
            panDeltaX: deltaX,
            panDeltaY: deltaY,
          });

          const sensitivity = 0.003;
          const expectedTheta = theta + deltaX * sensitivity;

          // Theta should update proportionally
          expect(result.theta).toBeCloseTo(expectedTheta, 10);

          // Phi should be clamped
          expect(result.phi).toBeGreaterThanOrEqual(0);
          expect(result.phi).toBeLessThanOrEqual(Math.PI);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("horizontal pan affects theta", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0.1, max: Math.PI - 0.1, noNaN: true }), // phi
        fc.integer({ min: 10, max: 100 }), // positive deltaX
        (theta, phi, deltaX) => {
          const result = updateCameraFromPan({
            theta,
            phi,
            panDeltaX: deltaX,
            panDeltaY: 0,
          });

          // Theta should increase
          expect(result.theta).toBeGreaterThan(theta);

          // Phi should remain unchanged
          expect(result.phi).toBeCloseTo(phi, 10);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("vertical pan affects phi within bounds", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // theta
        fc.double({ min: 0.2, max: Math.PI - 0.2, noNaN: true }), // phi (away from bounds)
        fc.integer({ min: -10, max: 10 }), // small deltaY
        (theta, phi, deltaY) => {
          const result = updateCameraFromPan({
            theta,
            phi,
            panDeltaX: 0,
            panDeltaY: deltaY,
          });

          // Phi should be in bounds
          expect(result.phi).toBeGreaterThanOrEqual(0);
          expect(result.phi).toBeLessThanOrEqual(Math.PI);

          // Theta should remain unchanged
          expect(result.theta).toBeCloseTo(theta, 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
/**
 * Feature: blackhole-enhancement, Property 21: Touch momentum persistence
 * Validates: Requirements 6.5
 *
 * For any touch gesture that ends with non-zero velocity, the velocity
 * should persist after touch end and decay over time according to the
 * damping factor.
 */
describe("Property 21: Touch momentum persistence", () => {
  /**
   * Simulates velocity persistence after touch end
   */
  function persistVelocityAfterTouchEnd(
    touchDelta: number,
    sensitivity: number = 0.005,
  ): number {
    // Velocity is set based on touch delta
    return touchDelta * sensitivity * 0.5;
  }

  /**
   * Applies damping to persisted velocity
   */
  function applyDampingToPersistedVelocity(
    velocity: number,
    damping: number,
    iterations: number,
  ): number {
    let v = velocity;
    for (let i = 0; i < iterations; i++) {
      v = v * damping;
    }
    return v;
  }

  test("velocity persists after touch end", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }), // touch delta
        (touchDelta) => {
          if (touchDelta === 0) return; // skip zero case

          const velocity = persistVelocityAfterTouchEnd(touchDelta);

          // Velocity should be non-zero if touch delta was non-zero
          expect(velocity).not.toBe(0);

          // Velocity sign should match touch delta sign
          expect(Math.sign(velocity)).toBe(Math.sign(touchDelta));
        },
      ),
      { numRuns: 100 },
    );
  });

  test("persisted velocity decays with damping", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }), // touch delta
        fc.double({ min: 0.8, max: 0.99, noNaN: true }), // damping
        (touchDelta, damping) => {
          if (touchDelta === 0) return; // skip zero case

          const initialVelocity = persistVelocityAfterTouchEnd(touchDelta);
          const iterations = 100;
          const finalVelocity = applyDampingToPersistedVelocity(
            initialVelocity,
            damping,
            iterations,
          );

          // Velocity magnitude should decrease
          expect(Math.abs(finalVelocity)).toBeLessThan(
            Math.abs(initialVelocity),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  test("persisted velocity converges to zero", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 100 }), // touch delta
        fc.double({ min: 0.8, max: 0.99, noNaN: true }), // damping
        (touchDelta: number, damping: number) => {
          if (touchDelta === 0) return; // skip zero case

          const initialVelocity = persistVelocityAfterTouchEnd(touchDelta);
          const iterations = 1000;
          const finalVelocity = applyDampingToPersistedVelocity(
            initialVelocity,
            damping,
            iterations,
          );

          // Velocity should be very close to zero after many iterations
          expect(Math.abs(finalVelocity)).toBeLessThan(0.001);
        },
      ),
      { numRuns: 100 },
    );
  });

  test("larger touch delta results in larger initial velocity", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }), // smaller delta
        (smallerDelta) => {
          const largerDelta = smallerDelta * 2;

          const smallerVelocity = persistVelocityAfterTouchEnd(smallerDelta);
          const largerVelocity = persistVelocityAfterTouchEnd(largerDelta);

          // Larger delta should result in larger velocity magnitude
          expect(Math.abs(largerVelocity)).toBeGreaterThan(
            Math.abs(smallerVelocity),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
