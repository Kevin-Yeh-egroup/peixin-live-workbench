import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "佩欣每日工作台",
  description: "Read-only Google Sheets dashboard for Peixin workflows.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
