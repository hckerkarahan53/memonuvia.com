import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import { AppProviders } from "@/components/providers/AppProviders";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SiteChrome } from "@/components/layout/SiteChrome";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MemoNuvia — Personalized Natural Photo Slates",
  description:
    "Personalized photo slates made with your photo and names. Custom printed and shipped from the US & UK.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${playfair.variable} antialiased`}>
        <AppProviders>
          <AuthProvider>
            <SiteChrome>{children}</SiteChrome>
          </AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}
