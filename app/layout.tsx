import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoopDrop — loop & sample marketplace on ARC",
  description: "Buy and sell loops, one-shots & samples directly. $0.05–$0.15 USDC. NFT license minted on every purchase. Powered by ARC testnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
