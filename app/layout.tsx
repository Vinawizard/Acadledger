import type React from "react";
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { cookieToInitialState } from "wagmi";
import { config } from "@/lib/config";
import { headers } from "next/headers";
import WagmiProviderComp from "@/lib/wagmi-provider";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "AI-Backed Trustless Credential Attestation",
  description:
    "Policy-driven institutional attestation platform with SHA-256 proofs on Polygon Amoy",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const initialState = cookieToInitialState(config, headersList.get("cookie"));

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} font-sans`}>
        <WagmiProviderComp initialState={initialState}>
          <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false} themes={["dark", "light", "grey"]}>
            {children}
          </ThemeProvider>
        </WagmiProviderComp>
      </body>
    </html>
  );
}
