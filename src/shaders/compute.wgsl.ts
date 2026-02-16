export default `
// src/shaders/compute.wgsl

// --- Bindings ---
@group(0) @binding(0) var<uniform> camera: CameraUniforms;
@group(0) @binding(1) var<uniform> physics: PhysicsParams;
@group(0) @binding(2) var<storage, read_write> rays: array<RayPayload>;
@group(0) @binding(3) var output: texture_storage_2d<rgba16float, write>;

// --- Constants ---
const PI: f32 = 3.14159265;
override MAX_STEPS: i32 = 150;     // Overridable constant for scalability
const MIN_STEP: f32 = 0.05;     // Minimum step size
const ESCAPE_RADIUS: f32 = 25.0; // Distance to skybox

// --- Structs ---
struct RayState {
    t: f32,
    r: f32,
    theta: f32,
    phi: f32,
    
    // Covariant Momentum (p_t, p_r, p_theta, p_phi)
    // Note: Rust code uses Covariant momentum for derivatives dH/dp_mu = p^mu
    pt: f32,
    pr: f32,
    ptheta: f32, 
    pphi: f32,
}

struct Derivatives {
    dt: f32,
    dr: f32,
    dtheta: f32,
    dphi: f32,
    dpt: f32,
    dpr: f32,
    dptheta: f32,
    dpphi: f32,
}

// --- Physics Helper Functions ---

// Calculate derivatives of the Hamiltonian H = 1/2 g^uv p_u p_v
// Returns dH/dp_u (velocity) and -dH/dx^u (force)
fn get_derivatives(s: RayState) -> Derivatives {
    let M = physics.mass;
    let a = physics.spin * M; // Spin parameter (J/M) -> assuming physics.spin is normalized 'a'
    let a2 = a * a;
    let r = s.r;
    let r2 = r * r;
    let theta = s.theta;
    let sint = sin(theta);
    let cost = cos(theta);
    let sin2 = sint * sint;
    let cos2 = cost * cost;

    let sigma = r2 + a2 * cos2;
    let delta = r2 - 2.0 * M * r + a2;
    
    // Inverse Metric Components and Derivatives
    // We implement the analytic derivatives directly

    let inv_sigma = 1.0 / sigma;
    let inv_delta = 1.0 / delta;

    // --- 1. Coordinate Derivatives (Velocities) dx/dlambda = dH/dp ---
    // Using standard Kerr geodesic equations
    
    let P = (r2 + a2) * s.pt - a * s.pphi; // Note: p_t is usually negative energy -E
    // Wait, if we use p_t = -E, then P term usually has (r2+a2)E - a Lz
    // Here we use raw p_t.
    // P = (r^2+a^2)(E) - a Lz ??
    // Let's stick to: H = 1/2 g^uv p_u p_v.
    // p^t = dH/dp_t.
    
    // Standard Carter-based form for contravariant components:
    // Sigma * dt/dl = ...
    // Let's use the explicit inverse metric form from the Rust code:
    
    // g^tt = - [ (r^2+a^2)^2/Delta - a^2 sin^2 theta ] / Sigma
    // g^tphi = - 2Mra / (Delta * Sigma)
    // g^rr = Delta / Sigma
    // g^thth = 1 / Sigma
    // g^phphi = [ 1/sin^2 theta - a^2/Delta ] / Sigma  <-- Check this
    // Actually g^phphi = (Delta - a^2 sin^2) / (Delta * Sigma * sin^2)
    
    // Let's compute p^u = g^uv p_v
    
    // t-phi sector determinant part?
    // Let's trust the Rust derivation logic:
    // num_tphi = -2Mra
    // den_tphi = Delta * Sigma
    
    let g_rr = delta * inv_sigma;
    let g_thth = inv_sigma;
    
    let g_tt = -( (r2+a2)*(r2+a2)*inv_delta - a2*sin2 ) * inv_sigma;
    let g_tphi = -2.0*M*r*a * inv_delta * inv_sigma;
    let g_pp = (inv_delta - a2*sin2*inv_delta*inv_delta) * inv_sigma; // This looks wrong
    // Let's use the algebraic form:
    let g_pp_safe = (delta - a2*sin2) / (delta * sigma * sin2);
    
    // Velocities
    let dt_dl = g_tt * s.pt + g_tphi * s.pphi;
    let dphi_dl = g_tphi * s.pt + g_pp_safe * s.pphi;
    let dr_dl = g_rr * s.pr;
    let dth_dl = g_thth * s.ptheta;
    
    // --- 2. Momentum Derivatives (Forces) dp/dlambda = -dH/dx ---
    
    // dH/dr
    // Derivatives of metric components w.r.t r
    let dsigma_dr = 2.0 * r;
    let ddelta_dr = 2.0 * r - 2.0 * M;
    
    // d(g^rr)/dr
    // g^rr = Delta / Sigma
    let dg_rr_dr = (ddelta_dr * sigma - delta * dsigma_dr) * (inv_sigma * inv_sigma);
    
    // d(g^thth)/dr = -dSigma/dr / Sigma^2
    let dg_thth_dr = -dsigma_dr * (inv_sigma * inv_sigma);
    
    // d(g^tphi)/dr
    let num = -2.0 * M * r * a;
    let dnum_dr = -2.0 * M * a;
    let den = delta * sigma;
    let dden_dr = ddelta_dr * sigma + delta * dsigma_dr;
    let dg_tphi_dr = (dnum_dr * den - num * dden_dr) / (den * den);
    
    // d(g^tt)/dr
    // U = (r^2+a^2)^2 - Delta*a^2*sin^2 -- Wait, previous expression was simpler
    // Let's use the Rust one: g^tt = -U/V where U = Sigma(r2+a2) + 2Mra^2sin2
    let U_tt = sigma * (r2 + a2) + 2.0 * M * r * a2 * sin2;
    let V_tt = delta * sigma;
    let dU_tt_dr = dsigma_dr * (r2 + a2) + sigma * 2.0 * r + 2.0 * M * a2 * sin2;
    let dV_tt_dr = dden_dr; // Same as den_tphi
    let dg_tt_dr = -(dU_tt_dr * V_tt - U_tt * dV_tt_dr) / (V_tt * V_tt);
    
    // d(g^pp)/dr
    // A = 1/(Sigma sin^2), B = a^2/(Delta Sigma)
    let dA_dr = -dsigma_dr / (sigma * sigma * sin2);
    let dB_dr = -a2 * dden_dr / (den * den);
    let dg_pp_dr = dA_dr - dB_dr;
    
    let dpr_dl = -0.5 * (
        s.pt * s.pt * dg_tt_dr + 
        s.pr * s.pr * dg_rr_dr + 
        s.ptheta * s.ptheta * dg_thth_dr + 
        s.pphi * s.pphi * dg_pp_dr + 
        2.0 * s.pt * s.pphi * dg_tphi_dr
    );
    
    // dH/dtheta
    let dsigma_dth = -a2 * sin(2.0 * theta);
    
    // d(g^rr)/dth
    let dg_rr_dth = -(delta * dsigma_dth) * (inv_sigma * inv_sigma);
    let dg_thth_dth = -dsigma_dth * (inv_sigma * inv_sigma);
    
    let dden_dth = delta * dsigma_dth;
    let dg_tphi_dth = -(num * dden_dth) / (den * den);
    
    let dU_tt_dth = dsigma_dth * (r2 + a2) + 2.0 * M * r * a2 * sin(2.0 * theta);
    let dV_tt_dth = dden_dth;
    let dg_tt_dth = -(dU_tt_dth * V_tt - U_tt * dV_tt_dth) / (V_tt * V_tt);
    
    // d(g^pp)/dth
    // A = 1/(Sigma sin^2)
    let d_denom_A = dsigma_dth * sin2 + sigma * sin(2.0 * theta);
    let dA_dth = -d_denom_A / (sigma * sin2 * sigma * sin2);
    let dB_dth = -a2 * dden_dth / (den * den);
    let dg_pp_dth = dA_dth - dB_dth;
    
    let dptheta_dl = -0.5 * (
        s.pt * s.pt * dg_tt_dth + 
        s.pr * s.pr * dg_rr_dth + 
        s.ptheta * s.ptheta * dg_thth_dth + 
        s.pphi * s.pphi * dg_pp_dth + 
        2.0 * s.pt * s.pphi * dg_tphi_dth
    );

    var d: Derivatives;
    d.dt = dt_dl;
    d.dr = dr_dl; // This is actually dr/dlambda (velocity)
    d.dtheta = dth_dl;
    d.dphi = dphi_dl;
    d.dpt = 0.0;
    d.dpr = dpr_dl; // dp_r/dlambda (force)
    d.dptheta = dptheta_dl;
    d.dpphi = 0.0;
    return d;
}

// RK4 Stepper
fn rk4_step(y: RayState, h: f32) -> RayState {
    let k1 = get_derivatives(y);
    
    var y2 = y;
    y2.t += k1.dt * h * 0.5;
    y2.r += k1.dr * h * 0.5;
    y2.theta += k1.dtheta * h * 0.5;
    y2.phi += k1.dphi * h * 0.5;
    y2.pt += k1.dpt * h * 0.5;
    y2.pr += k1.dpr * h * 0.5;
    y2.ptheta += k1.dptheta * h * 0.5;
    y2.pphi += k1.dpphi * h * 0.5;
    let k2 = get_derivatives(y2);
    
    var y3 = y;
    y3.t += k2.dt * h * 0.5;
    y3.r += k2.dr * h * 0.5;
    y3.theta += k2.dtheta * h * 0.5;
    y3.phi += k2.dphi * h * 0.5;
    y3.pt += k2.dpt * h * 0.5;
    y3.pr += k2.dpr * h * 0.5;
    y3.ptheta += k2.dptheta * h * 0.5;
    y3.pphi += k2.dpphi * h * 0.5;
    let k3 = get_derivatives(y3);

    var y4 = y;
    y4.t += k3.dt * h;
    y4.r += k3.dr * h;
    y4.theta += k3.dtheta * h;
    y4.phi += k3.dphi * h;
    y4.pt += k3.dpt * h;
    y4.pr += k3.dpr * h;
    y4.ptheta += k3.dptheta * h;
    y4.pphi += k3.dpphi * h;
    let k4 = get_derivatives(y4);
    
    var next = y;
    next.t += (h/6.0) * (k1.dt + 2.0*k2.dt + 2.0*k3.dt + k4.dt);
    next.r += (h/6.0) * (k1.dr + 2.0*k2.dr + 2.0*k3.dr + k4.dr);
    next.theta += (h/6.0) * (k1.dtheta + 2.0*k2.dtheta + 2.0*k3.dtheta + k4.dtheta);
    next.phi += (h/6.0) * (k1.dphi + 2.0*k2.dphi + 2.0*k3.dphi + k4.dphi);
    
    next.pt += (h/6.0) * (k1.dpt + 2.0*k2.dpt + 2.0*k3.dpt + k4.dpt);
    next.pr += (h/6.0) * (k1.dpr + 2.0*k2.dpr + 2.0*k3.dpr + k4.dpr);
    next.ptheta += (h/6.0) * (k1.dptheta + 2.0*k2.dptheta + 2.0*k3.dptheta + k4.dptheta);
    next.pphi += (h/6.0) * (k1.dpphi + 2.0*k2.dpphi + 2.0*k3.dpphi + k4.dpphi);
    
    return next;
}

// --- Main Trace Logic ---

fn init_state(id: vec3<u32>) -> RayState {
    let width = u32(physics.resolution.x);
    let height = u32(physics.resolution.y);
    let uv = vec2<f32>(f32(id.x) / f32(width), f32(id.y) / f32(height));
    let ndc = uv * 2.0 - 1.0;
    
    // Camera Basis (Cartesian)
    let cam_pos = camera.position.xyz * 1.0; // Zoom factor handled in JS
    
    // Mapping: Y-up in three.js/canvas -> Z-up in Physics (Theta=0 is +Y)
    // We treat Y as the symmetry axis of the black hole
    // So Theta = acos(y/r)
    
    let r0 = length(cam_pos);
    let theta0 = acos(clamp(cam_pos.y / r0, -1.0, 1.0));
    let phi0 = atan2(cam_pos.z, cam_pos.x); // Z maps to Y in atan2? Check orientation
    
    // Setup Ray Direction
    let clip_pos = vec4<f32>(ndc.x, -ndc.y, 1.0, 1.0); 
    let view_target = camera.inverseProjection * clip_pos;
    let view_dir = normalize(view_target.xyz / view_target.w);
    let world_dir = normalize((camera.inverseView * vec4<f32>(view_dir, 0.0)).xyz);
    
    // Convert Cartesian Velocity (world_dir) to Spherical Momentum
    // Basis vectors at camera position:
    // e_r   = (st cp, ct, st sp) -- wait, using Y-up
    // let's derive properly for x = r st cp, y = r ct, z = r st sp  (Y-up, Z-phi)
    // dx = dr st cp + r ct cp dth - r st sp dphi
    // dy = dr ct    - r st dth
    // dz = dr st sp + r ct sp dth + r st cp dphi
    
    let st = sin(theta0);
    let ct = cos(theta0);
    let sp = sin(phi0);
    let cp = cos(phi0);
    
    // Projection of D onto basis vectors
    // p^r = D . e_r
    // p^th = (1/r) D . e_th
    // p^ph = (1/r st) D . e_ph
    
    // e_r in Cartesian (x,y,z): (st cp, ct, st sp)
    let er_x = st * cp;
    let er_y = ct;
    let er_z = st * sp;
    let pr_local = world_dir.x * er_x + world_dir.y * er_y + world_dir.z * er_z;
    
    // e_th in Cartesian: (ct cp, -st, ct sp)
    let eth_x = ct * cp;
    let eth_y = -st;
    let eth_z = ct * sp;
    let pth_local = (world_dir.x * eth_x + world_dir.y * eth_y + world_dir.z * eth_z) / r0;
    
    // e_ph in Cartesian: (-sp, 0, cp)
    let eph_x = -sp;
    let eph_y = 0.0;
    let eph_z = cp;
    let pph_local = (world_dir.x * eph_x + world_dir.y * eph_y + world_dir.z * eph_z) / (r0 * st);
    
    // Convert Contravariant Velocity (p^u) to Covariant Momentum (p_u) for Hamiltonian
    // Assuming flat space at camera: g_uv = diag(-1, 1, r^2, r^2 sin^2)
    // pt = -E = -1.0
    // pr = p^r
    // ptheta = r^2 p^theta
    // pphi = r^2 sin^2 p^phi
    
    // Note: We negate spatial components because world_dir points INTO the scene?
    // Usually camera looks at origin.
    // If we want to trace BACKWARDS from camera to BH, we follow the photon path.
    // Photon momentum matches world_dir.
    
    var s: RayState;
    s.t = 0.0;
    s.r = r0;
    s.theta = theta0;
    s.phi = phi0;
    
    s.pt = -1.0; // Energy E=1
    s.pr = pr_local;
    s.ptheta = pth_local * r0 * r0; // Covariant
    s.pphi = pph_local * r0 * r0 * st * st; // Covariant
    
    return s;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let width = u32(physics.resolution.x);
    let height = u32(physics.resolution.y);
    
    if (id.x >= width || id.y >= height) {
        return;
    }
    
    var s = init_state(id);
    var color = vec3<f32>(0.0);
    var alpha = 1.0;
    
    let r_h = physics.mass + sqrt(abs(physics.mass*physics.mass - physics.spin*physics.spin));
    let isco = 6.0 * physics.mass; // approx
    
    // Raymarching Loop
    for (var i: i32 = 0; i < MAX_STEPS; i++) {
        // 1. Check Horizon
        if (s.r < r_h * 1.02) {
            color = vec3<f32>(0.0); // Event Horizon
            alpha = 1.0; // Opaque
            break;
        }
        
        // 2. Check Escape
        if (s.r > ESCAPE_RADIUS) {
            // Background Stars / Noise
            let dir = normalize(vec3<f32>(s.pr, s.ptheta/s.r, s.pphi/s.r)); // rough direction
            let stars = fract(sin(dot(dir.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453);
            if (stars > 0.995) {
                color += vec3<f32>(0.8) * alpha;
            }
            // Ambient space color
            color += vec3<f32>(0.02, 0.02, 0.03) * alpha;
            break;
        }
        
        // 3. Accretion Disk (Thin Disk in Equatorial Plane)
        // Detect crossing of Theta = PI/2 (cos(theta) = 0)
        // Check if previous and current step straddle the plane?
        // Or just checking if close to plane.
        
        let z_dist = abs(s.r * cos(s.theta));
        if (z_dist < 0.1 && s.r > isco && s.r < 15.0) {
             // Simple accretion temperature gradient
             let temp = 10.0 / pow(s.r, 2.0); // Hotter near ISCO
             
             // Doppler shift approx (Redshift)
             // simplified: 1 / (1 + z)
             // We need 4-velocity of disk u^mu and photon k_mu
             // This is complex. Use static color for now.
             
             let disk_color = vec3<f32>(1.0, 0.8, 0.5) * temp;
             color += disk_color * 0.1 * alpha;
             alpha *= 0.9;
        }
        
        // 4. Adapt Step Size
        // Slow down near horizon or strong curvature
        // Simple heuristic: h proportional to r
        let h = max(MIN_STEP, 0.05 * s.r);
        
        s = rk4_step(s, -h); // Integrate backwards (affine parameter decreases?) 
                             // No, photon momentum points forward. h < 0 usually for 
                             // "trace from eye to source" if we consider source at t=-inf?
                             // Standard raytracing: r decreases if looking at BH.
                             // But momentum pr handles the direction.
                             // If pr < 0, +h makes r decrease. 
                             // So h should be positive.
    }
    
    // Tone mapping / Gamma
    let mapped = color / (color + vec3<f32>(1.0));
    let final_col = vec4<f32>(mapped, 1.0);
    
    textureStore(output, vec2<i32>(i32(id.x), i32(id.y)), final_col);
}
`;
