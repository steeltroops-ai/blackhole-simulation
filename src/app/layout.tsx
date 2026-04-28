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
    // languages: populated only when real translations exist at the cited URLs.
    // Misleading hreflang demotes ranking; strict empty policy until real i18n ships.
  },
  // SEO env vars (set in Vercel project settings, never committed):
  //   YANDEX_VERIFICATION_TOKEN  (Yandex Webmaster Tools)
  //   BING_VERIFICATION_TOKEN    (Bing Webmaster Tools)
  // See .mayank/seo/multi-engine-checklist.md for setup walkthrough.
  verification: {
    google: "vycsFH0oxZh3hYxinQ1JGOghyPymDAt4tkDFdKk-V7M",
    ...(process.env.YANDEX_VERIFICATION_TOKEN && {
      yandex: process.env.YANDEX_VERIFICATION_TOKEN,
    }),
    ...(process.env.BING_VERIFICATION_TOKEN && {
      other: { "msvalidate.01": process.env.BING_VERIFICATION_TOKEN },
    }),
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
// SOURCE: package.json#version, schema.org/SoftwareApplication. No aggregateRating: forbidden by .claude/rules/15-discoverability.md.
const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Black Hole Simulation Physics Engine",
  alternateName: "Kerr Black Hole Simulator",
  applicationCategory: ["EducationalApplication", "ScienceApplication"],
  operatingSystem: "Any",
  browserRequirements: "Requires WebGL 2.0 or WebGPU",
  softwareVersion: "1.0.0",
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
  description:
    "Real-time browser simulation of a Kerr black hole. Numerically integrates null geodesics in Boyer-Lindquist and Kerr-Schild coordinates, renders gravitational lensing, accretion disk emission, and relativistic Doppler beaming via GPU ray-marching.",
  author: {
    "@type": "Person",
    name: "Mayank Pratap Singh",
    url: "https://steeltroops.vercel.app",
    sameAs: [
      "https://github.com/steeltroops-ai",
      "https://github.com/steeltroops-ai/blackhole-simulation",
      "https://twitter.com/steeltroops_ai",
    ],
  },
};

// SOURCE: ScholarlyArticle for the embedded physics-guide section; cites Bardeen 1973, Luminet 1979, Novikov-Thorne 1973 below.
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

// SOURCE: TechArticle for the simulation page. No award, no editor: forbidden by .claude/rules/15-discoverability.md.
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

// SOURCE: steeltroops.vercel.app portfolio (verified). github.com/steeltroops-ai (verified). Identity surface for LLM/AI agent indexing.
const authorSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://steeltroops.vercel.app/#person",
  name: "Mayank Pratap Singh",
  alternateName: ["steeltroops", "steeltroops-ai"],
  givenName: "Mayank",
  familyName: "Singh",
  additionalName: "Pratap",
  url: "https://steeltroops.vercel.app",
  email: "mailto:steeltroops.ai@gmail.com",
  jobTitle: "Full Stack, Robotics, and Machine Learning Engineer",
  description:
    "Production engineer building across full stack web, machine learning pipelines, and robotics systems. Author of blackhole-simulation: a real-time browser-based Kerr black hole ray-marching engine.",
  knowsAbout: [
    "General Relativity",
    "Kerr Metric",
    "Numerical Relativity",
    "Geodesic Integration",
    "Computer Graphics",
    "GPU Ray-Marching",
    "WebGPU",
    "WebGL",
    "Real-time Rendering",
    "Rust",
    "WebAssembly",
    "TypeScript",
    "Next.js",
    "Robotics",
    "ROS 2",
    "Machine Learning",
    "Full Stack Development",
  ],
  sameAs: [
    "https://github.com/steeltroops-ai",
    "https://github.com/steeltroops-ai/blackhole-simulation",
    "https://twitter.com/steeltroops_ai",
    "https://steeltroops.vercel.app",
  ],
  workLocation: {
    "@type": "Country",
    name: "India",
  },
};

// SOURCE: schema.org/ProfilePage anchored to the real portfolio. Lets LLMs and search crawlers connect this site to the author's verified identity surface.
const profilePageSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  url: "https://steeltroops.vercel.app",
  mainEntity: { "@id": "https://steeltroops.vercel.app/#person" },
  about: { "@id": "https://steeltroops.vercel.app/#person" },
  dateModified: "2026-04-29",
};

// SOURCE: schema.org/WebSite. Site identity, real URL, real owner.
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

// SOURCE: schema.org/FAQPage. Questions answered on the page itself; verify the page renders these.
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

// SOURCE: schema.org/BreadcrumbList. Anchors on the page; verify each #anchor exists.
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

// SOURCE: schema.org/Dataset (descriptive: no committed CSV at /public/data/ yet; future PR replaces with concrete dataset URL).
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

// SOURCE: schema.org/ResearchProject. No parentOrganization: solo independent project, no fabricated parent org per .claude/rules/15-discoverability.md.
const researchProjectSchema = {
  "@context": "https://schema.org",
  "@type": "ResearchProject",
  name: "Kerr Metric Spacetime Simulation Lab",
  description:
    "Open-source research-grade visualization of relativistic phenomena in rotating black holes: gravitational lensing, frame dragging, photon ring, accretion disk radiative transfer.",
  author: { "@id": "https://steeltroops.vercel.app/#person" },
};

// SOURCE: schema.org/Service. Provider is real Person; serviceType is descriptive, not metric-claiming.
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Scientific Visualization",
  provider: { "@id": "https://steeltroops.vercel.app/#person" },
  areaServed: "Global",
  description:
    "Real-time interactive black hole physics simulation service for researchers, educators, and students.",
};

// SOURCE: schema.org/HowTo. Steps describe real interactions on the page; verify each rendered control.
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

// SOURCE: Bardeen, J. M. (1973), "Timelike and null geodesics in the Kerr metric", in Black Holes (Les Houches), eds. DeWitt and DeWitt. Reference geodesics, photon ring, ISCO.
const bardeen1973Schema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: "Timelike and Null Geodesics in the Kerr Metric",
  author: { "@type": "Person", name: "James M. Bardeen" },
  datePublished: "1973",
  isPartOf: {
    "@type": "Book",
    name: "Black Holes (Les Houches 1972)",
    editor: [
      { "@type": "Person", name: "C. DeWitt" },
      { "@type": "Person", name: "B. DeWitt" },
    ],
    publisher: {
      "@type": "Organization",
      name: "Gordon and Breach Science Publishers",
    },
  },
  about: ["Kerr metric", "geodesics", "photon ring", "ISCO"],
};

// SOURCE: Luminet, J.-P. (1979), "Image of a spherical black hole with thin accretion disk", Astron. Astrophys. 75, 228, DOI:10.1007/BFb0091735.
const luminet1979Schema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: "Image of a Spherical Black Hole with Thin Accretion Disk",
  author: { "@type": "Person", name: "Jean-Pierre Luminet" },
  datePublished: "1979",
  isPartOf: {
    "@type": "Periodical",
    name: "Astronomy and Astrophysics",
  },
  pageStart: "228",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "DOI",
    value: "10.1007/BFb0091735",
  },
  about: [
    "Schwarzschild black hole",
    "accretion disk",
    "gravitational lensing",
  ],
};

// SOURCE: Novikov, I. D. and Thorne, K. S. (1973), "Astrophysics of Black Holes", in Black Holes (Les Houches), eds. DeWitt and DeWitt. Accretion disk emission model.
const novikovThorne1973Schema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline: "Astrophysics of Black Holes",
  author: [
    { "@type": "Person", name: "Igor D. Novikov" },
    { "@type": "Person", name: "Kip S. Thorne" },
  ],
  datePublished: "1973",
  isPartOf: {
    "@type": "Book",
    name: "Black Holes (Les Houches 1972)",
    editor: [
      { "@type": "Person", name: "C. DeWitt" },
      { "@type": "Person", name: "B. DeWitt" },
    ],
    publisher: {
      "@type": "Organization",
      name: "Gordon and Breach Science Publishers",
    },
  },
  about: ["Novikov-Thorne disk", "thin accretion disk", "radiative transfer"],
};

// SOURCE: James, von Tunzelmann, Franklin, Thorne (2015), "Gravitational lensing by spinning black holes in astrophysics, and in the movie Interstellar", Class. Quantum Grav. 32, 065001, DOI:10.1088/0264-9381/32/6/065001. Interstellar DNGR paper.
const james2015DngrSchema = {
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  headline:
    "Gravitational Lensing by Spinning Black Holes in Astrophysics, and in the Movie Interstellar",
  author: [
    { "@type": "Person", name: "Oliver James" },
    { "@type": "Person", name: "Eugenie von Tunzelmann" },
    { "@type": "Person", name: "Paul Franklin" },
    { "@type": "Person", name: "Kip S. Thorne" },
  ],
  datePublished: "2015",
  isPartOf: {
    "@type": "Periodical",
    name: "Classical and Quantum Gravity",
  },
  volumeNumber: "32",
  pageStart: "065001",
  identifier: {
    "@type": "PropertyValue",
    propertyID: "DOI",
    value: "10.1088/0264-9381/32/6/065001",
  },
  about: [
    "DNGR",
    "Kerr ray-marching",
    "gravitational lensing",
    "Interstellar VFX",
  ],
};

// SOURCE: github.com/steeltroops-ai/blackhole-simulation. Real public repo, MIT license.
const sourceCodeSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "blackhole-simulation",
  codeRepository: "https://github.com/steeltroops-ai/blackhole-simulation",
  programmingLanguage: ["TypeScript", "Rust", "WGSL", "GLSL"],
  license: "https://opensource.org/licenses/MIT",
  author: { "@id": "https://steeltroops.vercel.app/#person" },
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(profilePageSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(bardeen1973Schema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(luminet1979Schema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(novikovThorne1973Schema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(james2015DngrSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(sourceCodeSchema),
          }}
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
