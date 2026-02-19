const ataaShader = `
// src/shaders/postprocess/ataa.wgsl
// Advanced Temporal Anti-Aliasing Resolve Pass

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> physics: PhysicsParams;
@group(0) @binding(2) var currTex: texture_2d<f32>;
@group(0) @binding(3) var histTex: texture_2d<f32>;
@group(0) @binding(4) var output: texture_storage_2d<rgba16float, write>;

fn RGBToYCoCg(rgb: vec3<f32>) -> vec3<f32> {
    let y = dot(rgb, vec3<f32>(0.25, 0.5, 0.25));
    let co = dot(rgb, vec3<f32>(0.5, 0.0, -0.5));
    let cg = dot(rgb, vec3<f32>(-0.25, 0.5, -0.25));
    return vec3<f32>(y, co, cg);
}

fn YCoCgToRGB(ycocg: vec3<f32>) -> vec3<f32> {
    let y = ycocg.x;
    let co = ycocg.y;
    let cg = ycocg.z;
    let r = y + co - cg;
    let g = y + cg;
    let b = y - co - cg;
    return vec3<f32>(r, g, b);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let size = textureDimensions(currTex);
    if (id.x >= size.x || id.y >= size.y) { return; }
    
    let pos = vec2<i32>(i32(id.x), i32(id.y));
    let uv = (vec2<f32>(id.xy) + 0.5) / vec2<f32>(size);
    
    // --- 1. Neighborhood Clipping ---
    var m1 = vec3<f32>(0.0);
    var m2 = vec3<f32>(0.0);
    let center = RGBToYCoCg(textureLoad(currTex, pos, 0).rgb);
    
    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            let samplePos = clamp(pos + vec2<i32>(dx, dy), vec2<i32>(0), vec2<i32>(size) - 1);
            let s = RGBToYCoCg(textureLoad(currTex, samplePos, 0).rgb);
            m1 += s;
            m2 += s * s;
        }
    }
    
    let mean = m1 / 9.0;
    let std = sqrt(max(m2 / 9.0 - mean * mean, vec3<f32>(0.0)));
    let boxMin = mean - 2.0 * std;
    let boxMax = mean + 2.0 * std;

    // --- 2. Motion Reprojection ---
    // Reconstruct world ray for this pixel
    let ndc = uv * 2.0 - 1.0;
    let clip_pos = vec4<f32>(ndc.x, -ndc.y, 1.0, 1.0);
    let view_target = camera.inv_proj * clip_pos;
    let view_dir = normalize(view_target.xyz / view_target.w);
    let world_dir = (camera.inv_view * vec4<f32>(view_dir, 0.0)).xyz;
    
    // Assume secondary rays/background are at "infinity", but disk is closer.
    // We use a heuristic "reprojection depth" (e.g., 10.0 units) 
    // to align the most visually significant structures.
    let reprojectDepth = 12.0; 
    let worldPos = camera.position + world_dir * reprojectDepth;
    
    let prevClip = camera.prev_view_proj * vec4<f32>(worldPos, 1.0);
    let prevNDC = prevClip.xy / prevClip.w;
    let prevUV = prevNDC * vec2<f32>(0.5, -0.5) + 0.5;

    // --- 3. Sampling & Blending ---
    var history = RGBToYCoCg(textureSampleLevel(histTex, samplerLinear, prevUV, 0.0).rgb);
    history = clamp(history, boxMin, boxMax);
    
    // Feedback factor: lower for movement, higher for stability
    // We can calculate 'disocclusion' based on depth or NDV, but for now 0.9 is safe.
    let feedback = 0.92;
    let resolvedYCoCg = mix(center, history, feedback);
    
    textureStore(output, pos, vec4<f32>(YCoCgToRGB(resolvedYCoCg), 1.0));
}

@group(0) @binding(5) var samplerLinear: sampler;
`;

export default ataaShader;
