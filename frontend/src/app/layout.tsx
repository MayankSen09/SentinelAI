import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelAI — On-Chain Execution Control Layer",
  description:
    "An on-chain execution control layer for autonomous AI agents on Solana. Monitor reputation, configure policies, and simulate transactions in real-time.",
};

import { SolanaProvider } from "@/components/SolanaProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}
