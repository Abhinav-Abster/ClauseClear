import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClauseClear — Accessible Legal Document Comprehension",
  description:
    "Plain-language legal document simplifier, grounded clause & risk analyzer, and contract comparison workspace. Informational assistance that empowers users without replacing professional legal advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="min-h-screen bg-md-background text-md-on-surface antialiased selection:bg-md-secondary-container selection:text-md-on-secondary-container">
        {children}
      </body>
    </html>
  );
}
