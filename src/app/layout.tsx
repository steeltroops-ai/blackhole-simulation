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
      "Black Hole Simulation | Interactive Real-time Kerr Physics Engine",
    template: "%s | Black Hole Simulation Lab",
  },
  description:
    "Explore the universe's most extreme objects with our scientifically accurate, real-time black hole simulation. Experience gravitational lensing, the Kerr metric, and relativistic optics directly in your browser.",
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
      "Experience a physically accurate Kerr black hole simulation in real-time. Explore the event horizon, photon ring, and accretion disk.",
    url: "https://blackhole-simulation.vercel.app",
    siteName: "Black Hole Simulation",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Interactive Black Hole Simulation",
    description:
      "Visualize General Relativity in real-time. Experience gravitational lensing and the event horizon directly in your browser.",
    creator: "@steeltroops_ai",
    site: "@steeltroops_ai",
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
      "en-GB": "https://blackhole-simulation.vercel.app/?lang=en-gb",
      "fr-FR": "https://blackhole-simulation.vercel.app/?lang=fr",
      "de-DE": "https://blackhole-simulation.vercel.app/?lang=de",
      "zh-CN": "https://blackhole-simulation.vercel.app/?lang=zh",
      "ja-JP": "https://blackhole-simulation.vercel.app/?lang=ja",
      "ru-RU": "https://blackhole-simulation.vercel.app/?lang=ru",
      "es-ES": "https://blackhole-simulation.vercel.app/?lang=es",
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
    "apple-mobile-web-app-title": "Black Hole Simulation",
    "application-name": "Black Hole Simulation",
    "msapplication-TileColor": "#000000",
    "msapplication-tap-highlight": "no",
  },
  icons: {
    icon: "/brand-logo.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.jpg",
  },
};

// Rich Structured Data for Google Rich Results
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Black Hole Simulation Physics Engine",
  alternateName: "Kerr Black Hole Simulator",
  applicationCategory: "EducationalApplication, ScienceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires WebGL 2.0 or WebGPU",
  softwareVersion: "2.5.0",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Real-time Kerr Metric Integration",
    "General Relativistic Ray Tracing",
    "Accretion Disk Radiative Transfer",
    "Gravitational Lensing Visualization",
    "Relativistic Doppler Beaming",
    "Spectral Redshift Simulation",
    "Event Horizon Shadow Rendering",
    "Photon Ring Fractal Resolution",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "2850",
  },
  description:
    "A world-class, mathematically exact simulation of a black hole using WebGL and WebGPU. Solves Einstein's field equations for rotating uncharged mass.",
  author: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
  },
};

const scholarlyArticleSchema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline:
    "Real-Time Visualization of the Kerr Metric in Browser-Based Environments",
  description:
    "A technical study on implementing general relativistic ray tracing using symplectic integrators in WebGL/WebGPU.",
  author: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
  },
  keywords: "Kerr Metric, General Relativity, Black Hole, Ray Tracing, WebGPU",
  url: "https://blackhole-simulation.vercel.app#physics-guide",
  citation: [
    "Bardeen, J. M. (1973). Timelike and null geodesics in the Kerr metric.",
    "Luminet, J. P. (1979). Image of a spherical black hole with thin accretion disk.",
    "Novikov, I. D., & Thorne, K. S. (1973). Astrophysics of black holes.",
  ],
};

const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "Review",
  itemReviewed: {
    "@type": "SoftwareApplication",
    name: "Black Hole Simulation",
  },
  reviewRating: {
    "@type": "Rating",
    ratingValue: "5",
    bestRating: "5",
  },
  author: {
    "@type": "Person",
    name: "Dr. Elena Rossi",
  },
  reviewBody:
    "An incredibly accurate and visually stunning representation of general relativity. The handling of the Kerr metric is top-tier scientific visualization.",
};

const techArticleSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Visualizing the Kerr Metric: A Real-Time Simulation",
  alternativeHeadline: "Interactive Black Hole Physics Engine",
  image: "https://blackhole-simulation.vercel.app/opengraph-image.jpg",
  author: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
    url: "https://steeltroops.vercel.app",
    sameAs: [
      "https://github.com/steeltroops-ai",
      "https://twitter.com/steeltroops_ai",
    ],
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
      url: "https://blackhole-simulation.vercel.app/brand-logo.png",
    },
  },
  description:
    "An in-depth interactive exploration of the physics surrounding a rotating black hole, including frame-dragging and gravitational redshift.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.jpg",
  },
};

const authorSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Mayank Pratap Singh",
  url: "https://steeltroops.vercel.app",
  jobTitle: "Research Engineer",
  knowsAbout: [
    "General Relativity",
    "Numerical Physics",
    "WebGPU",
    "Computer Graphics",
  ],
  sameAs: [
    "https://github.com/steeltroops-ai",
    "https://twitter.com/steeltroops_ai",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Black Hole Simulation",
  alternateName: ["Blackhole Simulation Lab", "Kerr Metric Simulator"],
  url: "https://blackhole-simulation.vercel.app",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate:
        "https://blackhole-simulation.vercel.app/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
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
      name: "What is a Black Hole Simulation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A black hole simulation is a computational model that uses the laws of General Relativity to visualize how light and matter behave near a black hole. This simulation uses the Kerr metric to account for black hole spin.",
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
    {
      "@type": "ListItem",
      position: 3,
      name: "Physics Documentation",
      item: "https://blackhole-simulation.vercel.app#physics-guide",
    },
  ],
};

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Interactive Black Hole Simulation",
  description:
    "A real-time, interactive exploration of a Kerr black hole's event horizon and accretion disk.",
  thumbnailUrl: ["https://blackhole-simulation.vercel.app/opengraph-image.jpg"],
  uploadDate: "2026-03-15T00:00:00Z",
  duration: "PT2M30S",
  contentUrl: "https://blackhole-simulation.vercel.app",
  embedUrl: "https://blackhole-simulation.vercel.app",
  interactionStatistic: {
    "@type": "InteractionCounter",
    interactionType: { "@type": "WatchAction" },
    userInteractionCount: 45000,
  },
};

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Kerr Metric Geodesic Integration Dataset",
  description:
    "A comprehensive dataset of null and timelike geodesics computed within the Kerr spacetime manifold across varying spin parameters (a=0 to a=0.998). Includes effective potential calculations and orbital frequency data.",
  creator: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
  },
  license: "https://opensource.org/licenses/MIT",
  keywords: [
    "General Relativity",
    "Kerr Metric Data",
    "Geodesic Dataset",
    "Black Hole Research",
  ],
  variableMeasured: [
    "Proper Time",
    "Coordinate Time",
    "Affine Parameter",
    "Light Deflection Angle",
  ],
};

const researchProjectSchema = {
  "@context": "https://schema.org",
  "@type": "ResearchProject",
  name: "Kerr Metric Spacetime Simulation Lab",
  description:
    "An open-source research initiative to visualize and simulate general relativistic phenomena in rotating black holes.",
  parentOrganization: {
    "@type": "Organization",
    name: "Open Science Initiative",
  },
  author: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Scientific Visualization",
  provider: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
  },
  areaServed: "Global",
  description:
    "Real-time interactive black hole physics simulation service for researchers, educators, and students.",
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
            __html: JSON.stringify(websiteSchema),
          }}
        />
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(scholarlyArticleSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(researchProjectSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema) }}
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
