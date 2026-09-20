import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
