import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";
import { defaultLocale, themeCookie } from "@/i18n/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "PORTFOLIO_V4",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const c = await cookies();
  const lang = h.get("x-locale") ?? defaultLocale;
  const theme = c.get(themeCookie)?.value;
  return (
    <html
      lang={lang}
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
