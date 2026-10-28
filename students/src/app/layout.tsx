import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LmsProvider } from "@/context/LmsContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import LocalAiTutorWidget from "@/components/LocalAiTutorWidget";
import PqrSupportWidget from "@/components/PqrSupportWidget";
import LegalComplianceSystem from "@/components/LegalComplianceSystem";
import StudentPortalShell from "@/components/StudentPortalShell";
import SubscriptionCheckoutModal from "@/components/SubscriptionCheckoutModal";
import IdentityVerificationPrompt from "@/components/IdentityVerificationPrompt";
import MinimalistPreloader from "@/components/MinimalistPreloader";
import { LoginTransitionProvider } from "@/context/LoginTransitionContext";

const interSans = Inter({
  variable: "--font-udemy-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://iptapps.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IPT Academy | Campus Virtual, Cursos y Clases en Vivo",
    template: "%s | IPT Academy",
  },
  description:
    "Portal de formación técnica y arquitectura de software de Ivan Perez Tech (IPT).",
  authors: [{ name: "Ivan Perez (IPT)", url: "https://iptapps.com" }],
  creator: "Ivan Perez",
  publisher: "Ivan Perez",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "IPT Academy",
    title: "IPT Academy | Campus Virtual, Cursos y Clases en Vivo",
    description:
      "Plataforma de formación técnica y arquitectura de software de Ivan Perez Tech (IPT).",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IPT Academy",
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
          <LoginTransitionProvider>
            <LmsProvider>
            <SubscriptionProvider>
              <StudentPortalShell>{children}</StudentPortalShell>
              <SubscriptionCheckoutModal />
              <IdentityVerificationPrompt />
              <LegalComplianceSystem />
              <LocalAiTutorWidget />
              <PqrSupportWidget />
            </SubscriptionProvider>
          </LmsProvider>
          </LoginTransitionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
