import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LmsProvider } from "@/context/LmsContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import LocalAiTutorWidget from "@/components/LocalAiTutorWidget";
import LegalComplianceSystem from "@/components/LegalComplianceSystem";
import StudentPortalShell from "@/components/StudentPortalShell";
import SubscriptionCheckoutModal from "@/components/SubscriptionCheckoutModal";
import IdentityVerificationPrompt from "@/components/IdentityVerificationPrompt";
import MinimalistPreloader from "@/components/MinimalistPreloader";

const interSans = Inter({
  variable: "--font-udemy-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ipt-course-students.web.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IPT Course | Campus Virtual, Cursos y Clases en Vivo",
    template: "%s | IPT Course",
  },
  description:
    "Portal de formación de Ivan Perez Tech (IPT). Cursos estáticos, cursos dinámicos con evaluación docente y sesiones de clases en vivo.",
  authors: [{ name: "IPT (Ivan Perez Tech)", url: siteUrl }],
  creator: "IPT (Ivan Perez Tech)",
  publisher: "IPT (Ivan Perez Tech)",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "IPT Course",
    title: "IPT Course | Campus Virtual, Cursos y Clases en Vivo",
    description:
      "Cursos estáticos, cursos dinámicos con evaluación docente y sesiones de clases en vivo.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IPT Course",
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${interSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#000000] text-[#ffffff]">
        <MinimalistPreloader />
        <AuthProvider>
          <LmsProvider>
            <SubscriptionProvider>
              <StudentPortalShell>{children}</StudentPortalShell>
              <SubscriptionCheckoutModal />
              <IdentityVerificationPrompt />
              <LegalComplianceSystem />
              <LocalAiTutorWidget />
            </SubscriptionProvider>
          </LmsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
