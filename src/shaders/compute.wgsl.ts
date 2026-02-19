const computeShader = `
// src/shaders/compute.wgsl
// Wavefront Compute Kernel: Ingoing Kerr-Schild Geodesics

// --- Bindings ---
@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> physics: PhysicsParams;
@group(0) @binding(2) var<storage, read_write> rays: array<RayPayload>;
@group(0) @binding(3) var output: texture_storage_2d<rgba16float, write>;

// --- Constants ---
const PI: f32 = 3.14159265;
override MAX_STEPS: i32 = 150;
const MIN_STEP: f32 = 0.05;
const MAX_DIST: f32 = 100.0;

struct RayState {
    x: vec4<f32>, // (t, r, theta, phi)
    p: vec4<f32>, // (pt, pr, pth, pph)
}

struct Derivatives {
    dx: vec4<f32>,
    dp: vec4<f32>,
}

// Kerr-Schild Metric Utilities
fn get_horizon_radius(M: f32, a: f32) -> f32 {
    let disc = M * M - a * a;
    if (disc < 0.0) { return M; }
    return M + sqrt(disc);
}

fn get_isco_radius(M: f32, a: f32) -> f32 {
    let rs = a / M;
    let absS = abs(clamp(rs, -0.999, 0.999));
    let z1 = 1.0 + pow(1.0 - absS * absS, 1.0/3.0) * (pow(1.0 + absS, 1.0/3.0) + pow(1.0 - absS, 1.0/3.0));
    let z2 = sqrt(3.0 * absS * absS + z1 * z1);
    return M * (3.0 + z2 - sqrt((3.0 - z1) * (3.0 + z1 + 2.0 * z2)));
}

fn get_derivatives(s: RayState) -> Derivatives {
    let M = physics.mass;
    let a = physics.spin * M;
    let r = s.x.y;
    let theta = s.x.z;
    
    let r2 = r * r;
    let a2 = a * a;
    let sint = sin(theta);
    let cost = cos(theta);
    let sin2 = max(sint * sint, 1e-12);
    let cos2 = 1.0 - sin2;
    let sigma = r2 + a2 * cos2;
    let sigma2 = sigma * sigma;
    let delta = r2 - 2.0 * M * r + a2;
    
    // --- Contravariant Metric g^mu_nu (Ingoing Kerr Form) ---
    // Matches the stable Rust phd-kernel implementation
    let g_tt = -(1.0 + 2.0 * M * r / sigma);
    let g_tr = 2.0 * M * r / sigma;
    let g_rr = delta / sigma;
    let g_thth = 1.0 / sigma;
    let g_phph = 1.0 / (sigma * sin2);
    let g_rph = a / sigma;
    
    var dx: vec4<f32>;
    dx.x = g_tt * s.p.x + g_tr * s.p.y;
    dx.y = g_tr * s.p.x + g_rr * s.p.y + g_rph * s.p.w;
    dx.z = g_thth * s.p.z;
    dx.w = g_rph * s.p.y + g_phph * s.p.w;
    
    // --- Hamiltonian Derivatives dH/dx^mu ---
    let dsigma_dr = 2.0 * r;
    let dsigma_dth = -2.0 * a2 * sint * cost;
    let ddelta_dr = 2.0 * r - 2.0 * M;
    
    // d(g^tt)/dx
    let dg_tt_dr = -(2.0*M*(sigma - r*dsigma_dr)) / sigma2;
    let dg_tt_dth = (2.0*M*r*dsigma_dth) / sigma2;
    
    // dg_tr = -dg_tt (relative to background)
    let dg_tr_dr = -dg_tt_dr;
    let dg_tr_dth = -dg_tt_dth;
    
    let dg_rr_dr = (ddelta_dr * sigma - delta * dsigma_dr) / sigma2;
    let dg_rr_dth = -(delta * dsigma_dth) / sigma2;
    
    let dg_thth_dr = -dsigma_dr / sigma2;
    let dg_thth_dth = -dsigma_dth / sigma2;
    
    let dg_phph_dr = -dsigma_dr / (sigma2 * sin2);
    let dg_phph_dth = -(dsigma_dth * sin2 + sigma * sin(2.0*theta)) / (sigma2 * sin2 * sin2);
    
    let dg_rph_dr = -(a * dsigma_dr) / sigma2;
    let dg_rph_dth = -(a * dsigma_dth) / sigma2;

    var dh_dr: f32 = 0.5 * (
        dg_tt_dr * s.p.x*s.p.x + 
        dg_rr_dr * s.p.y*s.p.y + 
        dg_thth_dr * s.p.z*s.p.z + 
        dg_phph_dr * s.p.w*s.p.w +
        2.0 * dg_tr_dr * s.p.x*s.p.y +
        2.0 * dg_rph_dr * s.p.y*s.p.w
    );
    
    var dh_dth: f32 = 0.5 * (
        dg_tt_dth * s.p.x*s.p.x + 
        dg_rr_dth * s.p.y*s.p.y + 
        dg_thth_dth * s.p.z*s.p.z + 
        dg_phph_dth * s.p.w*s.p.w +
        2.0 * dg_tr_dth * s.p.x*s.p.y +
        2.0 * dg_rph_dth * s.p.y*s.p.w
    );

    var d: Derivatives;
    d.dx = dx;
    d.dp = vec4<f32>(0.0, -dh_dr, -dh_dth, 0.0);
    return d;
}

fn rk4_step(s: RayState, h: f32) -> RayState {
    let k1 = get_derivatives(s);
    var s2 = s; s2.x += k1.dx * h * 0.5; s2.p += k1.dp * h * 0.5;
    let k2 = get_derivatives(s2);
    var s3 = s; s3.x += k2.dx * h * 0.5; s3.p += k2.dp * h * 0.5;
    let k3 = get_derivatives(s3);
    var s4 = s; s4.x += k3.dx * h; s4.p += k3.dp * h;
    let k4 = get_derivatives(s4);
    
    var next = s;
    next.x += (h/6.0) * (k1.dx + 2.0*k2.dx + 2.0*k3.dx + k4.dx);
    next.p += (h/6.0) * (k1.dp + 2.0*k2.dp + 2.0*k3.dp + k4.dp);
    return next;
}

fn halton(index: u32, base: u32) -> f32 {
    var result: f32 = 0.0;
    var f: f32 = 1.0 / f32(base);
    var i: u32 = index;
    while (i > 0u) {
        result += f * f32(i % base);
        i = i / base;
        f = f / f32(base);
    }
    return result;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let width = u32(physics.resolution.x);
    let height = u32(physics.resolution.y);
    if (id.x >= width || id.y >= height) { return; }
    
    // Subpixel Jitter for TAA
    let jitter = vec2<f32>(
        halton((physics.frame_index % 8u) + 1u, 2u) - 0.5,
        halton((physics.frame_index % 8u) + 1u, 3u) - 0.5
    ) / vec2<f32>(f32(width), f32(height));

    let uv = vec2<f32>(f32(id.x) / f32(width), f32(id.y) / f32(height));
    let ndc = (uv + jitter) * 2.0 - 1.0;
    
    // Camera Projection
    let camPos = camera.position;
    let clip_pos = vec4<f32>(ndc.x, -ndc.y, 1.0, 1.0); 
    let view_target = camera.inv_proj * clip_pos;
    let view_dir = normalize(view_target.xyz / view_target.w);
    let world_dir = normalize((camera.inv_view * vec4<f32>(view_dir, 0.0)).xyz);
    
    // Init Kerr-Schild State
    let r0 = length(camPos);
    let theta0 = acos(clamp(camPos.y / r0, -1.0, 1.0));
    let phi0 = atan2(camPos.z, camPos.x);
    
    let st = sin(theta0);
    let ct = cos(theta0);
    let sp = sin(phi0);
    let cp = cos(phi0);
    
    // Far-field approximation: Spherical basis
    let pr_far = dot(world_dir, vec3<f32>(st*cp, ct, st*sp));
    let pth_far = dot(world_dir, vec3<f32>(ct*cp, -st, ct*sp)) / r0;
    let safe_st = max(st, 1e-4);
    let pph_far = dot(world_dir, vec3<f32>(-sp, 0.0, cp)) / (r0 * safe_st);
    
    var s: RayState;
    s.x = vec4<f32>(0.0, r0, theta0, phi0);
    s.p = vec4<f32>(-1.0, pr_far, pth_far * r0 * r0, pph_far * r0 * r0 * st * st);
    
    let M = physics.mass;
    let a = physics.spin * M;
    let rh = get_horizon_radius(M, a);
    let isco = get_isco_radius(M, a);
    
    var color = vec3<f32>(0.0);
    var alpha = 0.0;
    
    for (var i: i32 = 0; i < MAX_STEPS; i++) {
        let r = s.x.y;
        if (r < rh * 1.001) { break; }
        if (r > MAX_DIST) { 
            // Stars (Pseudo-random based on direction)
            let v_dir = normalize(vec3<f32>(s.p.y, s.p.z/r, s.p.w/(r*safe_st)));
            let star = fract(sin(dot(v_dir.xyz, vec3<f32>(12.9898, 78.233, 45.164))) * 43758.5453);
            if (star > 0.999) { color += vec3<f32>(1.0) * (1.0 - alpha); }
            break; 
        }
        
        // Accretion Disk Physics (Thin Disk Model)
        // Check disk crossing: theta = pi/2
        let prev_theta = s.x.z;
        
        // Step with adaptive size: curvature ~ 1/r^2
        let h = clamp((r - rh) * 0.15, MIN_STEP, 1.0);
        s = rk4_step(s, h);
        
        let curr_theta = s.x.z;
        if ((prev_theta - PI*0.5) * (curr_theta - PI*0.5) <= 0.0 && r > isco && r < 30.0) {
            // --- Relativistic Doppler & Redshift ---
            // Orbiting Velocity Omega = 1 / (r^1.5 + a)
            let Omega = 1.0 / (pow(r, 1.5) + a);
            
            // Simplified Doppler shift factor (g-factor)
            // g = E_obs / E_emit = (1 + Omega * (Lz/E)) / sqrt(-g_tt - 2*Omega*g_tphi - Omega^2*g_phiphi)
            // Lz/E is -p.w / p.x
            let g_factor = (1.0 - Omega * (s.p.w / s.p.x)) / sqrt(max(1.0 - 2.0*M/r, 1e-4));
            
            // Temperature T ~ r^-0.75 shifted by g^4 (bolometric) or g (peak)
            let shiftedT = (1.0 / pow(r/isco, 0.75)) * g_factor;
            
            // Accretion disk color shift (Blueing/Reddening)
            let baseColor = vec3<f32>(1.0, 0.5, 0.1);
            let blueShift = vec3<f32>(0.5, 0.7, 1.0) * max(g_factor - 1.0, 0.0);
            let redShift = vec3<f32>(1.0, 0.2, 0.0) * max(1.0 - g_factor, 0.0) * 0.5;
            
            let diskColor = (baseColor + blueShift - redShift) * shiftedT * 4.0;
            
            let opacity = 0.6 * shiftedT;
            color += diskColor * opacity * (1.0 - alpha);
            alpha += opacity;
        }

        if (alpha > 0.99) { break; }
    }
    
    textureStore(output, vec2<i32>(id.xy), vec4<f32>(color, 1.0));
}
`;
export default computeShader;
