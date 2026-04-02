import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "营养方案管理系统",
  description: "个性化营养评估与配餐方案可视化",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
