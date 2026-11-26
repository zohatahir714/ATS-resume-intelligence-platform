import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { readTheme } from "@/lib/theme-server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATS Resume Intelligence",
  description:
    "Upload a resume, paste a job description, and get an explainable ATS score.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The theme cookie decides the class here, on the server, so the first paint
  // already uses the chosen theme and nothing flashes (`src/lib/theme.ts`).
  const theme = await readTheme();

  return (
    <html lang="en" className={theme === "dark" ? "dark" : undefined}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
