import type { Metadata } from "next";
import { DM_Mono, Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "./pack.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Bare Minimum Pack — Governance AI",
  description:
    "Find out whether your organisation's use of AI is under minimum control, and get the four documents that close the gap.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-GB"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
