# Performance Validation and Tuning

This module provides tools for measuring and validating the performance of the black hole simulation.

## Overview

The performance validation system measures:
- **Baseline performance** with all features disabled
- **Individual feature costs** to understand performance impact
- **Performance targets** (75 FPS baseline, 60 FPS mobile, 120 FPS desktop)
- **Frame time budgets** and percentile statistics

## Requirements Validated

- **1.1**: Verify 75 FPS target on integrated GPU hardware with all features disabled
- **1.3**: Verify 60 FPS target on mobile devices
- **1.4**: Verify 120 FPS target on desktop with dedicated GPU
- **2.5**: Measure gravitational lensing 30% frame time reduction
- **4.5**: Measure accretion disk 40% frame time reduction
- **5.5**: Measure Doppler beaming 15% frame time reduction
- **6.4**: Measure background stars 10% frame time reduction
- **8.4**: Measure bloom 20% frame time reduction

## Usage

### Running Validation

```typescript
import { PerformanceValidator } from '@/performance/validation';

const validator = new PerformanceValidator();

// Generate complete validation report
const report = await validator.generateValidationReport(
    (stage, progress) => {
        console.log(`${stage}: ${Math.round(progress * 100)}%`);
    }
);

// Check if targets are met
console.log('Baseline 75 FPS:', report.meetsTargets.baseline75FPS);
console.log('Mobile 60 FPS:', report.meetsTargets.mobile60FPS);
console.log('Desktop 120 FPS:', report.meetsTargets.desktop120FPS);

// View feature costs
for (const cost of report.featureCosts) {
    console.log(`${cost.featureName}: ${cost.percentageImpact.toFixed(1)}% impact`);
}

// Export report
const json = validator.exportReport(report);
console.log(json);
```

### Measuring Baseline Only

```typescript
const baseline = await validator.measureBaseline((progress) => {
    console.log(`Progress: ${Math.round(progress * 100)}%`);
});

console.log(`Baseline FPS: ${baseline.averageFPS.toFixed(1)}`);
console.log(`Frame Time: ${baseline.averageFrameTimeMs.toFixed(2)}ms`);
```

### Measuring Feature Costs

```typescript
const baseline = await validator.measureBaseline();
const costs = await validator.measureFeatureCosts(
    baseline,
    (feature, progress) => {
        console.log(`Testing ${feature}: ${Math.round(progress * 100)}%`);
    }
);

for (const cost of costs) {
    console.log(`${cost.featureName}:`);
    console.log(`  FPS Impact: ${cost.fpsImpact.toFixed(1)}`);
    console.log(`  Frame Time Impact: +${cost.frameTimeImpactMs.toFixed(2)}ms`);
    console.log(`  Percentage Impact: ${cost.percentageImpact.toFixed(1)}%`);
}
```

## UI Component

The `PerformanceValidation` component provides a user-friendly interface for running validation tests:

```typescript
import { PerformanceValidation } from '@/components/ui/PerformanceValidation';

// In your component
<PerformanceValidation onClose={() => setShowValidation(false)} />
```

Features:
- One-click validation testing
- Real-time progress display
- Visual results with color-coded metrics
- Performance target indicators
- Feature cost breakdown
- Recommendations for optimization
- JSON report export

## Validation Process

1. **Warmup Phase** (1 second)
   - Allows system to stabilize
   - Readings during warmup are discarded

2. **Measurement Phase** (5 seconds per configuration)
   - Collects FPS readings every frame
   - Calculates statistics (average, min, max, percentiles)

3. **Analysis Phase**
   - Compares measurements against targets
   - Calculates feature costs
   - Generates recommendations

## Performance Metrics

### FPS Statistics
- **Average FPS**: Mean frames per second over measurement period
- **Min FPS**: Lowest FPS recorded
- **Max FPS**: Highest FPS recorded

### Frame Time Statistics
- **Average Frame Time**: Mean time per frame in milliseconds
- **P95 Frame Time**: 95th percentile (5% of frames are slower)
- **P99 Frame Time**: 99th percentile (1% of frames are slower)

### Feature Costs
- **FPS Impact**: Change in FPS when feature is enabled
- **Frame Time Impact**: Additional milliseconds per frame
- **Percentage Impact**: Percentage change in performance

## Performance Targets

| Target | Requirement | Description |
|--------|-------------|-------------|
| 75 FPS | 1.1 | Baseline with all features disabled on integrated GPU |
| 60 FPS | 1.3 | Mobile devices with default settings |
| 120 FPS | 1.4 | Desktop with dedicated GPU and all features enabled |

## Expected Feature Costs

| Feature | Expected Impact | Requirement |
|---------|----------------|-------------|
| Gravitational Lensing | 30% reduction | 2.5 |
| Accretion Disk | 40% reduction | 4.5 |
| Doppler Beaming | 15% reduction | 5.5 |
| Background Stars | 10% reduction | 6.4 |
| Bloom | 20% reduction | 8.4 |

## Recommendations

The validator generates recommendations based on measurements:

- **✓ Success**: Target is met
- **⚠️ Warning**: Performance issue detected
- **ℹ️ Info**: General information

Example recommendations:
- "✓ Baseline performance meets 75 FPS target (80.5 FPS)"
- "⚠️ Gravitational Lensing has high performance cost (35.2% impact)"
- "⚠️ Frame time budget exceeded: 125.4% (16.7ms / 13.3ms target)"

## Testing

Unit tests validate the validation logic:

```bash
bun test src/__tests__/performance/validation.test.ts --run
```

Tests cover:
- Baseline configuration
- Feature cost calculations
- Performance target validation
- Frame time budget calculations
- Report export
- Mobile detection
- Percentile calculations
- Recommendation generation

## Notes

- Validation requires a real browser environment with WebGL
- Results vary based on hardware and system load
- Run validation when system is idle for best results
- Close other applications to reduce interference
- Multiple runs may be needed for consistent results
