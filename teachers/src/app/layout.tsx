import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LmsProvider } from "@/context/LmsContext";
import LegalComplianceSystem from "@/components/LegalComplianceSystem";
import AdminStudioShell from "@/components/AdminStudioShell";

const interSans = Inter({
  variable: "--font-udemy-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const viewport: Viewport = {
  themeColor: "#151726",
  width: "device-width",
  initialScale: 1,
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://ipt-course-admin.web.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IPT Course Studio | Panel de Administración y Control Académico",
    template: "%s | IPT Course Studio",
  },
  description:
    "Panel de gestión administrativa y control académico de IPT Course (Ivan Perez Tech). Cursos, módulos, lecciones, calificaciones, calendario, roles RBAC y credenciales.",
  authors: [{ name: "IPT (Ivan Perez Tech)", url: siteUrl }],
  creator: "IPT (Ivan Perez Tech)",
  publisher: "IPT (Ivan Perez Tech)",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: siteUrl,
    siteName: "IPT Course Studio",
    title: "IPT Course Studio | Panel de Administración y Control Académico",
    description:
      "Panel de gestión administrativa y control académico de IPT Course (Ivan Perez Tech).",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "IPT Course Studio",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${interSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  for (var i = 0; i < regs.length; i++) {
                    regs[i].unregister();
                  }
                });
              }
            `,
          }}
        />
        <AuthProvider>
          <LmsProvider>
            <AdminStudioShell>{children}</AdminStudioShell>
            <LegalComplianceSystem />
          </LmsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
