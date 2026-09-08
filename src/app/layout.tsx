import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Capacity Connect — Ministry of Earth Sciences",
  description: "Digital Capacity Building and Learning Management Portal for MoES Autonomous Institutes (SIH26075)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#FBFBF9] text-zinc-950 min-h-screen antialiased selection:bg-zinc-200 selection:text-zinc-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
