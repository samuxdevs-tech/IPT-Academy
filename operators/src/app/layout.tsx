import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "IPT Course Operators · Teachers & Admin Studio",
  description: "Portal de Operación, Docencia y Gobernanza de IPT Course (Ivan Perez Tech)",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] antialiased selection:bg-[#0071e3] selection:text-white font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
