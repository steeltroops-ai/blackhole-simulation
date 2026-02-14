/**
 * Shader Manager with Conditional Compilation
 * Manages variants and caches compiled programs.
 */

import type { FeatureToggles } from "@/types/features";
import { createShader, createProgram } from "@/utils/webgl-utils";

export interface ShaderVariant {
  features: FeatureToggles;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  program: WebGLProgram;
  compilationTimeMs: number;
}

export class ShaderManager {
  private variantCache: Map<string, ShaderVariant> = new Map();
  private gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  private generateCacheKey(features: FeatureToggles): string {
    return JSON.stringify({
      lensing: features.gravitationalLensing,
      quality: features.rayTracingQuality,
      disk: features.accretionDisk,
      doppler: features.dopplerBeaming,
      stars: features.backgroundStars,
      photon: features.photonSphereGlow,
      bloom: features.bloom,
      jets: features.relativisticJets,
      redshift: features.gravitationalRedshift,
      shadow: features.kerrShadow,
    });
  }

  getCacheSize(): number {
    return this.variantCache.size;
  }

  getCachedVariant(features: FeatureToggles): ShaderVariant | null {
    const key = this.generateCacheKey(features);
    return this.variantCache.get(key) || null;
  }

  generateShaderSource(baseSource: string, features: FeatureToggles): string {
    const defines: string[] = [];

    // IMPORTANT: Only emit #define when feature is ENABLED.
    // Do NOT emit "#define FEATURE 0" for disabled features, because
    // GLSL #ifdef checks if the symbol is DEFINED (any value), not if it is truthy.
    // Omitting the define entirely makes #ifdef correctly evaluate to false.
    if (features.gravitationalLensing) defines.push("#define ENABLE_LENSING 1");
    if (features.accretionDisk) defines.push("#define ENABLE_DISK 1");
    if (features.dopplerBeaming) defines.push("#define ENABLE_DOPPLER 1");
    if (features.backgroundStars) defines.push("#define ENABLE_STARS 1");
    if (features.photonSphereGlow) defines.push("#define ENABLE_PHOTON_GLOW 1");
    if (features.bloom) defines.push("#define ENABLE_BLOOM 1");
    if (features.relativisticJets) defines.push("#define ENABLE_JETS 1");
    if (features.gravitationalRedshift)
      defines.push("#define ENABLE_REDSHIFT 1");
    if (features.kerrShadow) defines.push("#define ENABLE_SHADOW_GUIDE 1");

    // Quality LODs
    defines.push(
      `#define RAY_QUALITY_${features.rayTracingQuality.toUpperCase()} 1`,
    );

    const sanitized = baseSource.replace(/\r/g, "").replace(/\t/g, "  ");
    const lines = sanitized.split("\n");

    // Find insertion point
    // 1. If #version exists, we MUST insert after it.
    // 2. If precision exists, it's good practice to insert after it (but after version is strict req).
    let insertAt = 0;

    const versionIndex = lines.findIndex((line) =>
      line.trim().startsWith("#version"),
    );
    const precisionIndex = lines.findIndex((line) =>
      line.trim().startsWith("precision"),
    );

    if (versionIndex !== -1) {
      // Must be after version
      insertAt = versionIndex + 1;
      // If precision is after version, put defines after precision too (cleaner)
      if (precisionIndex > versionIndex) {
        insertAt = precisionIndex + 1;
      }
    } else if (precisionIndex !== -1) {
      // No version, but precision exists
      insertAt = precisionIndex + 1;
    }

    // Add a guard to ensure no empty lines or weird formatting in defines
    const cleanDefines = defines.map((d) => d.trim());
    lines.splice(insertAt, 0, ...cleanDefines);

    return lines.join("\n");
  }

  compileShaderVariant(
    vertexSource: string,
    fragmentSource: string,
    features: FeatureToggles,
  ): ShaderVariant | null {
    const start = performance.now();
    const cached = this.getCachedVariant(features);
    if (cached) return cached;

    const fs = this.generateShaderSource(fragmentSource, features);
    const vs = this.generateShaderSource(vertexSource, features);

    const vertexShader = createShader(this.gl, this.gl.VERTEX_SHADER, vs);
    const fragmentShader = createShader(this.gl, this.gl.FRAGMENT_SHADER, fs);

    if (!vertexShader || !fragmentShader) return null;

    const program = createProgram(this.gl, vertexShader, fragmentShader);
    if (!program) return null;

    const variant: ShaderVariant = {
      features: { ...features },
      vertexShader,
      fragmentShader,
      program,
      compilationTimeMs: performance.now() - start,
    };

    this.variantCache.set(this.generateCacheKey(features), variant);
    return variant;
  }

  clearCache(): void {
    for (const variant of this.variantCache.values()) {
      this.gl.deleteProgram(variant.program);
      this.gl.deleteShader(variant.vertexShader);
      this.gl.deleteShader(variant.fragmentShader);
    }
    this.variantCache.clear();
  }
}
