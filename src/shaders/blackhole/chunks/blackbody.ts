import { PHYSICS_CONSTANTS } from "@/configs/physics.config";

export const BLACKBODY_CHUNK = `
  // Realistic blackbody radiation color
  vec3 blackbody(float temp) {
    temp = clamp(temp, ${PHYSICS_CONSTANTS.blackbody.tempMin.toFixed(1)}, ${PHYSICS_CONSTANTS.blackbody.tempMax.toFixed(1)});
    vec3 col;
    
    float t = temp / 100.0;
    
    // Red channel
    if(t <= ${PHYSICS_CONSTANTS.blackbody.redChannel.threshold.toFixed(1)}) {
      col.r = 1.0;
    } else {
      col.r = clamp(${PHYSICS_CONSTANTS.blackbody.redChannel.scale.toFixed(9)} * pow(t - ${PHYSICS_CONSTANTS.blackbody.redChannel.offset.toFixed(1)}, ${PHYSICS_CONSTANTS.blackbody.redChannel.exponent.toFixed(10)}), 0.0, 1.0);
    }
    
    // Green channel
    if(t <= ${PHYSICS_CONSTANTS.blackbody.redChannel.threshold.toFixed(1)}) {
      col.g = clamp(${PHYSICS_CONSTANTS.blackbody.greenChannel.logScale.toFixed(8)} * log(t) - ${Math.abs(PHYSICS_CONSTANTS.blackbody.greenChannel.logOffset).toFixed(9)}, 0.0, 1.0);
    } else {
      col.g = clamp(${PHYSICS_CONSTANTS.blackbody.greenChannel.powScale.toFixed(9)} * pow(t - ${PHYSICS_CONSTANTS.blackbody.redChannel.offset.toFixed(1)}, ${PHYSICS_CONSTANTS.blackbody.greenChannel.powExponent.toFixed(10)}), 0.0, 1.0);
    }
    
    // Blue channel
    if(t >= ${PHYSICS_CONSTANTS.blackbody.redChannel.threshold.toFixed(1)}) {
      col.b = 1.0;
    } else if(t <= ${PHYSICS_CONSTANTS.blackbody.blueChannel.threshold.toFixed(1)}) {
      col.b = 0.0;
    } else {
      col.b = clamp(${PHYSICS_CONSTANTS.blackbody.blueChannel.logScale.toFixed(9)} * log(t - ${PHYSICS_CONSTANTS.blackbody.blueChannel.offset.toFixed(1)}) - ${Math.abs(PHYSICS_CONSTANTS.blackbody.blueChannel.logOffset).toFixed(9)}, 0.0, 1.0);
    }
    
    return col;
  }

  // Approximate star color from B-V color index
  // Simplification of Planck locus: B-V from -0.3 (O-type, blue) to 2.0 (M-type, red)
  vec3 starColor(float bv) {
    float t = clamp(bv, -0.4, 2.0);
    vec3 col;
    if(t < 0.0) col = vec3(0.6, 0.7, 1.0); // O/B
    else if(t < 0.3) col = vec3(0.85, 0.88, 1.0); // A
    else if(t < 0.6) col = vec3(1.0, 0.96, 0.9); // F
    else if(t < 1.0) col = vec3(1.0, 0.85, 0.6); // G/K
    else col = vec3(1.0, 0.6, 0.4); // M
    return col;
  }
`;
