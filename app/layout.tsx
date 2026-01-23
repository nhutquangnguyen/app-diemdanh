import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { VersionChecker } from "@/components/VersionChecker";
import { NetworkErrorHandler } from "@/components/NetworkErrorHandler";

export const metadata: Metadata = {
  title: "Diemdanh.net - Hệ Thống Điểm Danh Thông Minh",
  description: "Giải pháp chấm công hiện đại với QR code, selfie và xác thực vị trí GPS",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DiemDanh" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className="antialiased">
        <Providers>
          <NetworkErrorHandler />
          <VersionChecker />
          {children}
        </Providers>
      </body>
    </html>
  );
}
