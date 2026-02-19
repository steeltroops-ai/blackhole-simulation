import { useState, useEffect } from "react";

export interface HardwareSupport {
  webgl: boolean;
  webgpu: boolean;
  isInApp: boolean;
  isReady: boolean;
  error?: string;
}

export function useHardwareSupport() {
  const [support, setSupport] = useState<HardwareSupport>({
    webgl: false,
    webgpu: false,
    isInApp: false,
    isReady: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSupport = async () => {
      // 1. Detect In-App browsers (Instagram, FB, LinkedIn, etc.)
      const ua = navigator.userAgent;
      const isInApp =
        /Instagram|FBAN|FBAV|LinkedIn|Threads|Messenger|Line|Twitter|MicroMessenger/i.test(
          ua,
        );

      // 2. Check WebGL 2 (Required for 3D textures and float buffers)
      let webgl = false;
      try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2");
        webgl = !!gl;
      } catch (e) {
        webgl = false;
      }

      // 3. Check WebGPU
      let webgpu = false;
      if (navigator.gpu) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          webgpu = !!adapter;
        } catch (e) {
          webgpu = false;
        }
      }

      setSupport({
        webgl,
        webgpu,
        isInApp,
        isReady: true,
      });
    };

    checkSupport();
  }, []);

  return support;
}
