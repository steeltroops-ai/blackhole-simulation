# Progressive Feature Loading

## Overview

The progressive feature loading system ensures that the black hole simulation starts rendering quickly (within 1 second) while additional features are compiled in the background. This provides a better user experience, especially on slower devices.

## Requirements

- **18.1**: Render basic black hole within 1 second
- **18.2**: Progressively enable features as shaders compile
- **18.3**: Display loading indicator for features being compiled
- **18.4**: Remove loading indicators when all features loaded
- **18.5**: Gracefully disable features on compilation failure

## Architecture

### Components

1. **ProgressiveFeatureLoader** (`src/shaders/progressive-loader.ts`)
   - Manages shader compilation state
   - Tracks compilation progress
   - Handles compilation failures gracefully

2. **LoadingIndicator** (`src/components/ui/LoadingIndicator.tsx`)
   - Displays loading progress UI
   - Shows individual feature compilation status
   - Automatically hides when loading is complete

3. **useProgressiveLoading** (`src/hooks/useProgressiveLoading.ts`)
   - React hook for managing progressive loading
   - Integrates with WebGL context
   - Provides loading state and enabled features

## Usage

### Basic Usage

```typescript
import { useProgressiveLoading } from '@/hooks/useProgressiveLoading';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';

function MyComponent() {
    const { loadingState, enabledFeatures, isReady, isLoading } = useProgressiveLoading({
        gl: glContext,
        requestedFeatures: {
            gravitationalLensing: true,
            rayTracingQuality: 'high',
            accretionDisk: true,
            dopplerBeaming: true,
            backgroundStars: true,
            photonSphereGlow: true,
            bloom: true,
        },
        vertexSource: vertexShaderSource,
        fragmentSource: fragmentShaderSource,
        enabled: true,
    });

    return (
        <>
            <LoadingIndicator loadingState={loadingState} />
            {isReady && <Canvas features={enabledFeatures} />}
        </>
    );
}
```

### Advanced Usage

```typescript
// Manual control with ProgressiveFeatureLoader
import { ProgressiveFeatureLoader } from '@/shaders/progressive-loader';
import { ShaderManager } from '@/shaders/manager';

const shaderManager = new ShaderManager(gl);
const loader = new ProgressiveFeatureLoader(shaderManager);

// Initialize loading
const state = await loader.initialize(
    requestedFeatures,
    vertexSource,
    fragmentSource
);

// Check if basic rendering is ready
if (loader.isBasicRenderingReady()) {
    // Start rendering with basic features
    startRendering();
}

// Get enabled features (excludes failed compilations)
const enabledFeatures = loader.getEnabledFeatures(requestedFeatures);

// Check individual feature status
if (loader.isFeatureCompiled('gravitationalLensing')) {
    // Enable lensing in UI
}

if (loader.isFeatureFailed('bloom')) {
    // Show warning about bloom not available
}
```

## Loading Sequence

1. **Initialization** (0-100ms)
   - Create shader manager
   - Initialize progressive loader
   - Set up compilation state

2. **Basic Rendering** (100-1000ms)
   - Compile minimal shader variant
   - Enable basic black hole rendering
   - Display canvas to user

3. **Progressive Compilation** (1000ms+)
   - Compile each feature individually
   - Update loading indicators
   - Enable features as they complete
   - Handle failures gracefully

4. **Completion**
   - All features compiled or failed
   - Remove loading indicators
   - Apply final feature configuration

## Error Handling

### Compilation Failures

When a feature fails to compile:
1. The feature is marked as failed
2. The feature is disabled in the final configuration
3. A warning is logged to console
4. Other features continue compiling normally

```typescript
// Check for failed features
const state = loader.getState();
for (const [featureName, featureState] of state.features) {
    if (featureState.status === 'failed') {
        console.warn(`Feature ${featureName} failed:`, featureState.error);
    }
}
```

### Timeout Handling

If basic rendering takes longer than 1 second:
- A warning is logged
- Rendering continues anyway
- User sees loading indicator

### Recovery

Features can be retried after failure:
```typescript
// Reset and retry
loader.reset();
await loader.initialize(requestedFeatures, vertexSource, fragmentSource);
```

## Performance Considerations

### Compilation Time

- Basic rendering: < 1 second (target)
- Individual features: 50-100ms each
- Total loading: 1-2 seconds for all features

### Memory Usage

- Each shader variant is cached
- Failed compilations don't allocate GPU memory
- Cache can be cleared with `shaderManager.clearCache()`

### CPU Impact

- Compilation happens asynchronously
- UI remains responsive during loading
- Progress updates every 100ms

## Testing

Property-based tests verify:
- Features only enabled after successful compilation
- Compilation progress tracked correctly
- Failed features disabled gracefully
- System continues with partial failures

Run tests:
```bash
bun test src/__tests__/shaders/progressive-loading.test.ts --run
```

## Integration with Existing Systems

### Shader Manager

Progressive loader uses ShaderManager for compilation:
- Leverages shader variant caching
- Reuses compiled shaders when possible
- Handles preprocessor directives

### Feature Toggles

Progressive loader respects feature toggle state:
- Only compiles requested features
- Disables features that fail compilation
- Updates feature state based on results

### Performance Monitor

Progressive loading integrates with performance monitoring:
- Tracks compilation times
- Reports loading progress
- Logs warnings for slow compilation

## Future Enhancements

Potential improvements:
1. Parallel compilation of independent features
2. Precompilation of common feature combinations
3. Progressive quality upgrades (low → high)
4. Persistent compilation cache across sessions
5. Adaptive feature selection based on device capabilities
