import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#6d28d2",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://datagan-course.iptapps.com"),
  title: {
    default: "DataGan Course | Certificación en Zootecnia y Gestión Ganadera",
    template: "%s | TecnoGan Academy",
  },
  description:
    "Plataforma oficial de capacitación zootécnica y operativa de TecnoGan. Domina las 73 métricas operativas de DataGan 360: curvas de lactancia, pesaje, GDP, días abiertos e ITH con certificación oficial.",
  keywords: [
    "gestión ganadera",
    "zootecnia de precisión",
    "software ganadero colombia",
    "curvas de lactancia",
    "estrés calórico ITH",
    "ganancia diaria de peso bovina",
    "DataGan 360",
    "TecnoGan",
    "capacitación agropecuaria",
    "certificación ganadera"
  ],
  authors: [{ name: "TecnoGan", url: "https://datagan-course.iptapps.com" }],
  creator: "TecnoGan",
  publisher: "TecnoGan",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "wMZ96I3KbW1qT0i86Xsr2N_u0UIYoxOwyYwHB68goFc",
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
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "https://datagan-course.iptapps.com",
    siteName: "TecnoGan Academy | DataGan",
    title: "DataGan Master Pro: Curso Oficial de Gestión Zootécnica y Ganadera",
    description:
      "Aprende a transformar datos de campo en rentabilidad real. Domina las 73 métricas zootécnicas de DataGan 360 con simuladores de reflejo operativo y sandbox.",
    images: [
      {
        url: "https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/images/datagan-course-cover-v2.jpeg?v=2",
        width: 1200,
        height: 630,
        alt: "Portada Oficial DataGan Master Pro - TecnoGan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DataGan Master Pro | Certificación en Gestión Ganadera Inteligente",
    description:
      "Domina las métricas operativas y zootécnicas de DataGan 360 con simulador práctico y certificación oficial.",
    images: [
      "https://pub-ac305c99ed4042c9976f0abc2d0123b3.r2.dev/images/datagan-course-cover-v2.jpeg?v=2",
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DataGan Academy",
  },
  icons: {
    icon: "/logo.webp",
    apple: "/logo.webp",
  },
};

const structuredSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": "https://datagan-course.iptapps.com/#organization",
      name: "TecnoGan",
      url: "https://datagan-course.iptapps.com",
      logo: "https://datagan-course.iptapps.com/logo.webp",
      description:
        "Organización especializada en software zootécnico, ganadería de precisión y capacitación operativa.",
      sameAs: ["https://tecnogan.com"]
    },
    {
      "@type": "Course",
      "@id": "https://datagan-course.iptapps.com/#course-datagan-master-pro",
      name: "DataGan Master Pro: Gestión Zootécnica",
      description:
        "Capacitación profesional en las 73 métricas operativas de DataGan 360: curvas de lactancia, pesaje ponderal, ganancia diaria de peso (GDP), días abiertos, estrés calórico (ITH) y contabilidad ganadera.",
      provider: {
        "@type": "Organization",
        name: "TecnoGan",
        sameAs: "https://datagan-course.iptapps.com"
      },
      courseCode: "DATAGAN-PRO-2026",
      educationalCredentialAwarded:
        "Certificado Zootécnico en Gestión Ganadera Inteligente",
      courseMode: "online",
      inLanguage: "es",
      isAccessibleForFree: false,
      offers: {
        "@type": "Offer",
        category: "Formación Profesional Zootécnica",
        price: "0",
        priceCurrency: "COP",
        availability: "https://schema.org/InStock"
      },
      hasCourseInstance: {
        "@type": "CourseInstance",
        courseMode: "online",
        courseWorkload: "PT34H"
      }
    }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredSchema),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
