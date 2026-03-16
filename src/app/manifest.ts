import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Black Hole Simulation",
    short_name: "Black Hole",
    description:
      "Interactive, real-time simulation of a Kerr black hole using General Relativity.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/brand-logo.png",
        sizes: "any",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.jpg",
        sizes: "512x512",
        type: "image/jpeg",
      },
    ],
    screenshots: [
      {
        src: "/opengraph-image.jpg",
        sizes: "1200x630",
        type: "image/jpeg",
        // @ts-expect-error - Next.js types might not support form_factor yet
        form_factor: "wide",
        label: "Interactive Black Hole Simulation",
      },
      {
        src: "/twitter-image.jpg",
        sizes: "1200x630",
        type: "image/jpeg",
        // @ts-expect-error - Next.js types might not support form_factor yet
        form_factor: "wide",
        label: "Real-time Kerr Metric Visualization",
      },
    ],
    categories: ["education", "simulation", "science", "physics"],
    orientation: "landscape",
  };
}
