import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ApolloProvider } from "@/components/providers/ApolloProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { InitializationProvider } from "@/components/providers/InitializationProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { RoutePreloader } from "@/components/ui/route-preloader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProtekAuto CMS",
  description: "Админ панель для управления контентом",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApolloProvider>
          <AuthProvider>
            <InitializationProvider>
              <RoutePreloader />
              {children}
              <ToastProvider />
            </InitializationProvider>
          </AuthProvider>
        </ApolloProvider>
      </body>
    </html>
  );
}
