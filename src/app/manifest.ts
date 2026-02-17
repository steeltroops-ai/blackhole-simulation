import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Blackhole Simulation Lab",
    short_name: "Blackhole Lab",
    description:
      "Interactive, real-time simulation of a Kerr black hole using General Relativity.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/opengraph-image.png",
        sizes: "1200x630",
        type: "image/png",
        // @ts-expect-error - Next.js types might not support form_factor yet
        form_factor: "wide",
        label: "Interactive Black Hole Simulation",
      },
      {
        src: "/twitter-image.png",
        sizes: "1200x630",
        type: "image/png",
        // @ts-expect-error - Next.js types might not support form_factor yet
        form_factor: "wide",
        label: "Real-time Kerr Metric Visualization",
      },
    ],
    categories: ["education", "simulation", "science", "physics"],
    orientation: "landscape",
  };
}
