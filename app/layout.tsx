import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider, AuthGate, RouteGuard, UserSelectModal } from "@/components/auth";
import { Header } from "@/components/layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suprema PDV | Caixa Semijoias",
  description: "Controle de vendas - loja de semijoias",
  icons: {
    icon: "/pdv.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <AuthProvider>
          <UserSelectModal />
          <AuthGate>
            <Header />
            <RouteGuard>
              <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">{children}</main>
            </RouteGuard>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
