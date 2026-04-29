/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance: Enable Gzip compression
  compress: true,
  // Security: Hide Next.js header
  poweredByHeader: false,
  // Strict Mode for better development practices
  reactStrictMode: true,
  // Compiler: Use SWC for minification
  swcMinify: true,

  // Production Optimizations
  compiler: {
    // Remove console.log in production for cleaner performance
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Asset Optimization
  experimental: {
    // Tree shake heavy libraries
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-slider",
    ],
  },

  webpack: (config, { isServer }) => {
    // Enable WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Fix for WASM in Next.js
    if (!isServer) {
      config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm";
    }

    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          // COEP=require-corp rejects same-origin sub-resources that don't
          // declare an embedding policy. Static assets in /public (logo,
          // favicon, the static-fallback render) and Next.js's optimized
          // image responses both go through this header rule, so a single
          // CORP=same-origin declaration unblocks every same-origin embed.
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
