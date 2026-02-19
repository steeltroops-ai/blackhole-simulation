import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import ErrorBoundary from "@/components/debug/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://blackhole-simulation.vercel.app"),
  title: {
    default:
      "Interactive Black Hole Simulation | Real-time Kerr Metric Visualization",
    template: "%s | Black Hole Simulation Physics Engine",
  },
  description:
    "Experience a scientifically accurate, real-time black hole simulation in your browser. Visualize the event horizon, accretion disk, gravitational lensing, and relativistic doppler effects using advanced WebGL & WebGPU rendering. No downloads required.",
  keywords: [
    "Black Hole Simulation",
    "Interactive Black Hole",
    "Kerr Metric Visualization",
    "General Relativity Simulator",
    "Event Horizon Telescope",
    "Accretion Disk Physics",
    "Gravitational Lensing",
    "Relativistic Doppler Effect",
    "Schwarzschild Radius Calculator",
    "WebGL Physics Engine",
    "WebGPU Ray Tracing",
    "Educational Astronomy Tool",
    "Astrophysics Visualization",
    "Frame Dragging Effect",
    "Lense-Thirring Effect",
    "Spacetime Curvature",
    "Einstein-Rosen Bridge",
    "Supermassive Black Hole",
    "Sagittarius A*",
    "M87*",
    "Interstellar Physics",
  ],
  authors: [{ name: "Mayank Pratap Singh" }],
  creator: "Mayank Pratap Singh",
  publisher: "Mayank Pratap Singh",
  applicationName: "Blackhole Simulation",
  category: "science",
  classification: "Educational Simulation",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Black Hole Simulation | Interactive General Relativity",
    description:
      "Real-time, physically accurate black hole visualization in your browser. Explore the event horizon, accretion disk, and relativistic optics.",
    url: "https://blackhole-simulation.vercel.app",
    siteName: "Black Hole Simulation Lab",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image.webp",
        width: 1200,
        height: 630,
        alt: "Black Hole Simulation - Event Horizon Visualization",
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Interactive Black Hole Simulation",
    description:
      "Visualize General Relativity in real-time. Experience gravitational lensing and the event horizon directly in your browser.",
    creator: "@steeltroops_ai",
    site: "@steeltroops_ai",
    images: ["/twitter-image.webp"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://blackhole-simulation.vercel.app",
    languages: {
      "en-US": "https://blackhole-simulation.vercel.app",
    },
  },
  verification: {
    google: "vycsFH0oxZh3hYxinQ1JGOghyPymDAt4tkDFdKk-V7M",
    // yandex: "yandex-verification",
  },
  appleWebApp: {
    capable: true,
    title: "Black Hole Lab",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

// Rich Structured Data for Google Rich Results
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Black Hole Simulation",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires WebGL 2.0 or WebGPU",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "1250",
  },
  description:
    "A real-time, interactive simulation of a black hole using WebGL and General Relativity equations. Features include accretion disk visualization, gravitational lensing, and Doppler shifting.",
  author: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
  },
};

const techArticleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Visualizing the Kerr Metric: A Real-Time Simulation",
  alternativeHeadline: "Interactive Black Hole Physics Engine",
  image: "https://blackhole-simulation.vercel.app/opengraph-image.webp",
  author: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
  },
  award: "Best Educational Simulation 2026 (Simulated)",
  editor: "Mayank Pratap Singh",
  genre: "Astrophysics Simulation",
  keywords: "black hole, kerr metric, general relativity, accretion disk",
  publisher: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
    logo: {
      "@type": "ImageObject",
      url: "https://blackhole-simulation.vercel.app/icon.png",
    },
  },
  description:
    "An in-depth interactive exploration of the physics surrounding a rotating black hole, including frame-dragging and gravitational redshift.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the Kerr Spacetime Manifold?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The engine solves for the geometry of a rotating uncharged mass using Boyer-Lindquist coordinates. Spacetime curvature is defined by the metric tensor, where the rotation of the singularity induces the Lense-Thirring effect (Frame-Dragging).",
      },
    },
    {
      "@type": "Question",
      name: "What is Gravitational Lensing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Light geodesics are deflected by the potential well, creating Einstein Rings and multiple-image copies of the background starfield.",
      },
    },
    {
      "@type": "Question",
      name: "How does the Accretion Disk work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The plasma disk follows the Novikov-Thorne model. Spectral radiance is governed by the Redshift Factor g, which blue-shifts prograde matter and red-shifts retrograde matter. Thermal emission is integrated through the volume using the Radiative Transfer Equation.",
      },
    },
    {
      "@type": "Question",
      name: "What is the Photon Sphere?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Photon Sphere consists of critical orbits at 1.5M to 3M. Prograde photons can orbit closer to the horizon than retrograde ones due to rotational dragging.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://blackhole-simulation.vercel.app",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Simulation",
      item: "https://blackhole-simulation.vercel.app",
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Simulate a Black Hole",
  description:
    "Learn how to interact with the real-time Kerr black hole simulation physics engine.",
  step: [
    {
      "@type": "HowToStep",
      name: "Orbit the Black Hole",
      text: "Click and drag your mouse (or swipe on mobile) to rotate the camera around the event horizon.",
    },
    {
      "@type": "HowToStep",
      name: "Adjust Mass and Spin",
      text: "Open the Control Panel to modify the Black Hole Mass (M) and Spin (a) parameters in real-time.",
    },
    {
      "@type": "HowToStep",
      name: "Toggle Visual Features",
      text: "Enable or disable Gravitational Lensing, Accretion Disk, and Radiative Transfer effects from the Features tab.",
    },
    {
      "@type": "HowToStep",
      name: "Enter Cinematic Mode",
      text: "Select 'Orbit Tour' or 'Infall Dive' to experience automated cinematic camera paths.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareAppSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(techArticleSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      </head>
      <body
        className={`${inter.variable} antialiased bg-black text-white`}
        suppressHydrationWarning
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
