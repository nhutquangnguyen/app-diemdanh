import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hệ Thống Điểm Danh - Check-in System",
  description: "Hệ thống điểm danh cho doanh nghiệp nhỏ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
