import type { Metadata } from "next";
import "./globals.css";
import "./product.css";
import "./auth.css";

export const metadata: Metadata = {
  title: "ФСП · Talent — подтверждённые навыки",
  description: "Платформа обратного найма ИТ-специалистов.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
