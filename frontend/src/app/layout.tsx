import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LmsProvider } from "@/context/LmsContext";
import LocalAiTutorWidget from "@/components/LocalAiTutorWidget";
import LegalComplianceSystem from "@/components/LegalComplianceSystem";
import StudentPortalShell from "@/components/StudentPortalShell";

const interSans = Inter({
  variable: "--font-udemy-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ipt-course.web.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IPT Course | Tus Clases, Tareas y Notas",
    template: "%s | IPT Course",
  },
  description:
    "Portal de clases en línea de IPT. Mira tus clases en video, consulta el calendario de entregas, envía tus tareas y revisa tus calificaciones.",
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
    title: "IPT Course | Tus Clases, Tareas y Notas",
    description:
      "Mira tus clases en video, consulta el calendario de entregas, envía tus tareas y revisa tus calificaciones.",
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
      <body className="min-h-full flex flex-col pb-16 md:pb-0 bg-[#ffffff] text-[#0f0f0f]">
        <AuthProvider>
          <LmsProvider>
            <StudentPortalShell>{children}</StudentPortalShell>
            <LegalComplianceSystem />
            <LocalAiTutorWidget />
          </LmsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
