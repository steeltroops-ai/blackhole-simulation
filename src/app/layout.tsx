import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import ErrorBoundary from "@/components/debug/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
    default: "Interactive Black Hole Simulation | Real-time General Relativity",
    template: "%s | Black Hole Simulation",
  },
  description:
    "Experience a scientifically accurate, real-time black hole simulation in your browser. Visualize the event horizon, accretion disk, and gravitational lensing effects using advanced WebGL rendering.",
  keywords: [
    "Black Hole",
    "Simulation",
    "General Relativity",
    "Event Horizon",
    "Accretion Disk",
    "WebGL",
    "Physics Engine",
    "Interactive Space",
    "Astronomy",
    "Educational Tool",
    "Kerr Metric",
    "Gravitational Lensing",
    "Relativistic Rendering",
  ],
  authors: [{ name: "SteelTroops AI" }],
  creator: "SteelTroops AI",
  publisher: "SteelTroops AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Black Hole Simulation | Interactive General Relativity",
    description:
      "Real-time, physically accurate black hole visualization in your browser. Explore the event horizon and accretion disk.",
    url: "https://blackhole-simulation.vercel.app",
    siteName: "Black Hole Simulation",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Interactive Black Hole Simulation Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Black Hole Simulation",
    description:
      "Real-time black hole interaction. Visualize general relativity in your browser.",
    images: ["/og-image.jpg"],
    creator: "@steeltroops",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://blackhole-simulation.vercel.app",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Black Hole Simulation",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "A real-time, interactive simulation of a black hole using WebGL and General Relativity equations. Features include accretion disk visualization, gravitational lensing, and Doppler shifting.",
  author: {
    "@type": "Organization",
    name: "SteelTroops AI",
    url: "https://steeltroops.ai",
  },
  keywords: "black hole, simulation, physics, webgl, education",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
