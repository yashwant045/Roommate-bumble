import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Roommate Bumble | Find Your Perfect Co-Living Buddy",
  description: "Advanced student roommate recommendation platform driven by machine learning distance matching, mutual swipes, and real-time chat integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-dark-500 text-slate-100 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
