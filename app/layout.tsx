import type { ReactNode } from "react";
import { Archivo_Black, JetBrains_Mono, Spectral } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const serif = Spectral({ weight: ["400"], style: ["italic", "normal"], subsets: ["latin"], variable: "--font-serif" });

export const metadata = {
  title: "The Federal Diet",
  description: "A taxpayer receipt: how federally fed is your favorite company?",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
