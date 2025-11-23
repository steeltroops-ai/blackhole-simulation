/**
 * Color utility functions for contrast checking and color manipulation
 */

/**
 * Convert RGB to relative luminance for contrast ratio calculation
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * 
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Relative luminance (0-1)
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
    // Convert to 0-1 range
    const R = r / 255;
    const G = g / 255;
    const B = b / 255;

    // Apply gamma correction
    const RsRGB = R <= 0.03928 ? R / 12.92 : Math.pow((R + 0.055) / 1.055, 2.4);
    const GsRGB = G <= 0.03928 ? G / 12.92 : Math.pow((G + 0.055) / 1.055, 2.4);
    const BsRGB = B <= 0.03928 ? B / 12.92 : Math.pow((B + 0.055) / 1.055, 2.4);

    // Calculate relative luminance
    return 0.2126 * RsRGB + 0.7152 * GsRGB + 0.0722 * BsRGB;
}

/**
 * Calculate contrast ratio between two colors
 * Formula from WCAG 2.1: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter color and L2 is the darker color
 * 
 * @param color1 - First color as [r, g, b] (0-255)
 * @param color2 - Second color as [r, g, b] (0-255)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: [number, number, number], color2: [number, number, number]): number {
    const L1 = getRelativeLuminance(color1[0], color1[1], color1[2]);
    const L2 = getRelativeLuminance(color2[0], color2[1], color2[2]);

    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color combination meets WCAG AA contrast ratio (4.5:1)
 * 
 * @param foreground - Foreground color as [r, g, b] (0-255)
 * @param background - Background color as [r, g, b] (0-255)
 * @returns True if contrast ratio >= 4.5:1
 */
export function meetsWCAGAA(foreground: [number, number, number], background: [number, number, number]): boolean {
    return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Convert RGB to HSL color space
 * 
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns HSL as [h, s, l] where h is 0-360, s and l are 0-1
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / delta + 2) / 6;
                break;
            case b:
                h = ((r - g) / delta + 4) / 6;
                break;
        }
    }

    return [h * 360, s, l];
}

/**
 * Convert HSL to RGB color space
 * 
 * @param h - Hue (0-360)
 * @param s - Saturation (0-1)
 * @param l - Lightness (0-1)
 * @returns RGB as [r, g, b] (0-255)
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;

    const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Increase color saturation while preserving hue
 * 
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param amount - Saturation increase amount (0-1), where 0 is no change and 1 is maximum saturation
 * @returns RGB as [r, g, b] (0-255)
 */
export function increaseSaturation(r: number, g: number, b: number, amount: number): [number, number, number] {
    const [h, s, l] = rgbToHsl(r, g, b);
    const newS = Math.min(1, s + amount);
    return hslToRgb(h, newS, l);
}

/**
 * Tone map a color while preserving hue
 * Uses Reinhard tone mapping to adjust brightness without changing hue
 * 
 * @param r - Red component (0-1)
 * @param g - Green component (0-1)
 * @param b - Blue component (0-1)
 * @param exposure - Exposure adjustment (default 1.0)
 * @returns RGB as [r, g, b] (0-1)
 */
export function toneMapPreserveHue(r: number, g: number, b: number, exposure: number = 1.0): [number, number, number] {
    // Convert to HSL
    const [h, s, l] = rgbToHsl(r * 255, g * 255, b * 255);

    // Apply Reinhard tone mapping to lightness only
    const exposedL = l * exposure;
    const toneMappedL = exposedL / (1 + exposedL);

    // Convert back to RGB with preserved hue and saturation
    const [newR, newG, newB] = hslToRgb(h, s, toneMappedL);

    return [newR / 255, newG / 255, newB / 255];
}
