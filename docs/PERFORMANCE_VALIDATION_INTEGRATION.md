# Performance Validation Integration Guide

This guide shows how to integrate the performance validation tool into the black hole simulation application.

## Quick Integration

### 1. Add State to Main Component

```typescript
import { useState } from 'react';
import { PerformanceValidation } from '@/components/ui/PerformanceValidation';

function App() {
    const [showValidation, setShowValidation] = useState(false);
    
    // ... rest of your component
}
```

### 2. Add Button to Control Panel

Add a button to open the validation UI in your control panel:

```typescript
<button
    onClick={() => setShowValidation(true)}
    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
>
    🔬 Performance Validation
</button>
```

### 3. Render Validation Component

```typescript
{showValidation && (
    <PerformanceValidation onClose={() => setShowValidation(false)} />
)}
```

## Complete Example

```typescript
import { useState } from 'react';
import { PerformanceValidation } from '@/components/ui/PerformanceValidation';
import { ControlPanel } from '@/components/ui/ControlPanel';
import { DebugOverlay } from '@/components/ui/DebugOverlay';

export default function BlackHoleSimulation() {
    const [showValidation, setShowValidation] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    
    // ... other state and logic
    
    return (
        <div className="relative w-full h-screen">
            {/* WebGL Canvas */}
            <canvas ref={canvasRef} className="w-full h-full" />
            
            {/* Control Panel */}
            <ControlPanel
                params={params}
                onParamsChange={setParams}
                // ... other props
            />
            
            {/* Debug Overlay */}
            <DebugOverlay
                enabled={showDebug}
                onToggle={setShowDebug}
                metrics={debugMetrics}
            />
            
            {/* Performance Validation */}
            {showValidation && (
                <PerformanceValidation 
                    onClose={() => setShowValidation(false)} 
                />
            )}
            
            {/* Validation Button (can be placed anywhere) */}
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                >
                    🐛 Debug
                </button>
                <button
                    onClick={() => setShowValidation(true)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                >
                    🔬 Validate Performance
                </button>
            </div>
        </div>
    );
}
```

## Integration with ControlPanel

To add the validation button to the existing ControlPanel component:

```typescript
// In ControlPanel.tsx

interface ControlPanelProps {
    // ... existing props
    onShowValidation?: () => void;
}

export const ControlPanel = ({
    // ... existing props
    onShowValidation,
}: ControlPanelProps) => {
    return (
        <div className="control-panel">
            {/* ... existing controls */}
            
            {/* Add validation button in the advanced section */}
            <div className="flex gap-2 mt-2">
                <button
                    onClick={onShowValidation}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    title="Run performance validation tests"
                >
                    🔬 Validate Performance
                </button>
            </div>
        </div>
    );
};
```

## Integration with DebugOverlay

You can also add a validation button to the debug overlay:

```typescript
// In DebugOverlay.tsx

interface DebugOverlayProps {
    // ... existing props
    onShowValidation?: () => void;
}

export const DebugOverlay = ({
    enabled,
    onToggle,
    metrics,
    onShowValidation,
}: DebugOverlayProps) => {
    if (!enabled) return null;
    
    return (
        <div className="debug-overlay">
            {/* ... existing debug info */}
            
            {/* Add validation button */}
            <button
                onClick={onShowValidation}
                className="w-full mt-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
                Run Full Validation
            </button>
        </div>
    );
};
```

## Programmatic Usage

You can also use the validator programmatically without the UI:

```typescript
import { PerformanceValidator } from '@/performance/validation';

async function runValidation() {
    const validator = new PerformanceValidator();
    
    // Run full validation
    const report = await validator.generateValidationReport(
        (stage, progress) => {
            console.log(`${stage}: ${Math.round(progress * 100)}%`);
        }
    );
    
    // Check results
    console.log('Baseline FPS:', report.baselineMeasurement.averageFPS);
    console.log('Meets 75 FPS target:', report.meetsTargets.baseline75FPS);
    
    // Log feature costs
    for (const cost of report.featureCosts) {
        console.log(`${cost.featureName}: ${cost.percentageImpact.toFixed(1)}% impact`);
    }
    
    // Export report
    const json = validator.exportReport(report);
    console.log('Full report:', json);
}
```

## Automated Testing

You can run validation automatically on startup or periodically:

```typescript
import { useEffect } from 'react';
import { PerformanceValidator } from '@/performance/validation';

function App() {
    useEffect(() => {
        // Run validation on startup (optional)
        const runStartupValidation = async () => {
            const validator = new PerformanceValidator();
            const baseline = await validator.measureBaseline();
            
            if (baseline.averageFPS < 60) {
                console.warn('Performance below target. Consider reducing quality.');
            }
        };
        
        // Uncomment to enable startup validation
        // runStartupValidation();
    }, []);
    
    // ... rest of component
}
```

## Best Practices

1. **Run validation when system is idle**
   - Close other applications
   - Ensure browser is not throttling
   - Wait for system to stabilize

2. **Run multiple times for consistency**
   - Results can vary based on system load
   - Average multiple runs for best results

3. **Export and save reports**
   - Keep historical data for comparison
   - Track performance over time
   - Share reports with team

4. **Use recommendations**
   - Follow optimization suggestions
   - Prioritize high-impact features
   - Validate after optimizations

5. **Test on target hardware**
   - Test on integrated GPU systems
   - Test on mobile devices
   - Test on various screen resolutions

## Keyboard Shortcuts (Optional)

You can add keyboard shortcuts for quick access:

```typescript
useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
        // Ctrl+Shift+V to open validation
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
            setShowValidation(true);
        }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

## Troubleshooting

### Validation Takes Too Long
- Reduce measurement duration in validator settings
- Close other applications
- Ensure browser is not throttling

### Inconsistent Results
- Run multiple times and average
- Check for background processes
- Ensure system is not thermal throttling

### Low Performance Detected
- Follow recommendations in report
- Disable expensive features
- Reduce render resolution
- Check for browser extensions interfering

## See Also

- [Performance Validation README](../src/performance/README.md)
- [Performance Monitoring](../src/performance/monitor.ts)
- [Benchmark Mode](../src/performance/benchmark.ts)
