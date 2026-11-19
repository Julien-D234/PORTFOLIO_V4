"use client";

import { themeCookie } from "@/i18n/config";

type Theme = "system" | "light" | "dark";

type Labels = {
  toggle: string;
  system: string;
  light: string;
  dark: string;
};

const ORDER: Theme[] = ["system", "light", "dark"];

function currentTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : "system";
}

export function ThemeToggle({ labels }: { labels: Labels }) {
  function cycle() {
    const next = ORDER[(ORDER.indexOf(currentTheme()) + 1) % ORDER.length] ?? "system";
    if (next === "system") {
      document.cookie = `${themeCookie}=; Max-Age=0; Path=/; SameSite=Lax`;
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.cookie = `${themeCookie}=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
      document.documentElement.setAttribute("data-theme", next);
    }
  }

  return (
    <button type="button" onClick={cycle} aria-label={labels.toggle} title={labels.toggle} className="theme-toggle">
      ◐
    </button>
  );
}
