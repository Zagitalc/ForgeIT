import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ForgeIT",
  description: "Local-first file converter and PDF toolkit",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
